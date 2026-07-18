import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import type { QueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { getSettings as apiFetchSettings } from '../api/settings';
import { listPharmacists } from '../api/pharmacists';
import { queryKeys } from '../api/queryKeys';
import { normalizeUploadMimeType } from '../utils/mimeType';
import type { FileMetadata, IPatient, PendingFileRef } from '../types';
import * as patientLocalRepository from './patientLocalRepository';
import * as settingsLocalRepository from './settingsLocalRepository';
import * as pharmacistsLocalRepository from './pharmacistsLocalRepository';
import * as syncQueue from './syncQueue';
import type { QueueEntry } from './syncQueue';

let isRunning = false;

interface UploadFilePayload {
  localPath: string;
  fileName: string;
  mimeType: string;
}

function isPendingFileRef(val: unknown): val is PendingFileRef {
  return typeof val === 'object' && val !== null && (val as PendingFileRef).pending === true && typeof (val as PendingFileRef).localPath === 'string';
}

function replacePendingFileRef(customFields: IPatient['customFields'], localPath: string, replacement: FileMetadata): IPatient['customFields'] {
  const sections = customFields.sections.map((section) => ({
    ...section,
    fields: section.fields.map((row) => {
      const updated: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (Array.isArray(val)) {
          updated[key] = val.map((item) => (isPendingFileRef(item) && item.localPath === localPath ? replacement : item));
        } else {
          updated[key] = val;
        }
      }
      return updated;
    })
  }));
  return { sections };
}

async function apiListPatients(): Promise<IPatient[]> {
  const { data } = await apiClient.get<{ data: { patients: IPatient[]; total: number } }>('/api/patients');
  return data.data.patients;
}

const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function isTransientError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return true;
  if (!err.response) return true;
  return err.response.status >= 500;
}

function isNotFoundError(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
  }
  return err instanceof Error ? err.message : 'Sync failed';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_ATTEMPTS - 1 || !isTransientError(err)) throw err;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

async function performDirectOp(entry: QueueEntry): Promise<void> {
  const payload = entry.payload as Record<string, unknown>;
  switch (entry.operationType) {
    case 'CREATE_PATIENT':
      await apiClient.post('/api/patients', { _id: entry.entityId, ...payload });
      return;
    case 'UPDATE_PATIENT':
      await apiClient.put(`/api/patients/${entry.entityId}`, payload);
      return;
    case 'DELETE_PATIENT':
      await apiClient.delete(`/api/patients/${entry.entityId}`);
      return;
    case 'DELETE_FILE': {
      const { publicId } = payload as { publicId: string };
      await apiClient.delete(`/api/files/${encodeURIComponent(publicId)}`);
      return;
    }
    default:
      return; // UPLOAD_FILE is handled in Phase 2
  }
}

export async function run(queryClient: QueryClient): Promise<{ synced: number; conflicts: number }> {
  if (isRunning) return { synced: 0, conflicts: 0 };
  isRunning = true;

  let synced = 0;
  let conflicts = 0;

  try {
    const queue = await syncQueue.getPendingQueue();

    // ─── Phase 1: Push non-upload ops directly via REST, with client-side retry ──
    const notSyncedEntityIds = new Set<string>();

    for (const entry of queue) {
      if (entry.operationType === 'UPLOAD_FILE') continue;

      try {
        await withRetry(() => performDirectOp(entry));
        if (entry.operationType === 'DELETE_PATIENT') {
          await patientLocalRepository.hardDelete(entry.entityId);
        }
        await syncQueue.markSynced(entry.id);
        synced++;
      } catch (err) {
        if ((entry.operationType === 'DELETE_PATIENT' || entry.operationType === 'DELETE_FILE') && isNotFoundError(err)) {
          // Already gone server-side (e.g. a previous attempt's response was lost) — deletes are idempotent.
          if (entry.operationType === 'DELETE_PATIENT') {
            await patientLocalRepository.hardDelete(entry.entityId);
          }
          await syncQueue.markSynced(entry.id);
          synced++;
          continue;
        }

        notSyncedEntityIds.add(entry.entityId);
        if (isTransientError(err)) {
          // Leave as 'pending' — retried automatically on the next sync run
          // (5-min interval or reconnect trigger in useSyncEngine), since
          // there's no server-side job queue to retry on our behalf anymore.
        } else {
          await syncQueue.markFailed(entry.id, extractErrorMessage(err));
          conflicts++;
        }
      }
    }

    // ─── Phase 2: File uploads ───────────────────────────────────────────────────
    for (const entry of queue) {
      if (entry.operationType !== 'UPLOAD_FILE') continue;
      // Skip if the patient's Phase 1 op didn't sync — patient may not exist on server yet
      if (notSyncedEntityIds.has(entry.entityId)) continue;

      try {
        const { localPath, fileName, mimeType } = entry.payload as UploadFilePayload;
        const formData = new FormData();
        formData.append('file', { uri: localPath, type: normalizeUploadMimeType(mimeType), name: fileName } as unknown as Blob);
        const uploadRes = await apiClient.post<{ data: { url: string; publicId: string } }>(`/api/files/upload/${entry.entityId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const { url, publicId } = uploadRes.data.data;

        const patient = await patientLocalRepository.getLocalById(entry.entityId);
        if (patient) {
          const updatedCustomFields = replacePendingFileRef(patient.customFields, localPath, { name: fileName, url, publicId });
          await apiClient.put(`/api/patients/${entry.entityId}`, { customFields: updatedCustomFields });
          await patientLocalRepository.updateLocal(entry.entityId, { customFields: updatedCustomFields }, 'synced');
          queryClient.invalidateQueries({ queryKey: queryKeys.patients.detail(entry.entityId) });
        }

        await FileSystem.deleteAsync(localPath, { idempotent: true });
        await syncQueue.markSynced(entry.id);
        synced++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Upload failed';
        await syncQueue.markFailed(entry.id, reason);
        conflicts++;
      }
    }

    // ─── Phase 3: Pull reconcile ─────────────────────────────────────────────────
    const serverPatients = await apiListPatients();
    const serverIdSet = new Set(serverPatients.map((p) => p.id));

    // Self-heal: a CREATE/UPDATE that looked unsynced this run (e.g. its response was
    // lost to a network blip after the request actually succeeded) but is demonstrably
    // present on the server now — mark it synced instead of retrying/failing forever.
    for (const entry of queue) {
      if (
        (entry.operationType === 'CREATE_PATIENT' || entry.operationType === 'UPDATE_PATIENT') &&
        notSyncedEntityIds.has(entry.entityId) &&
        serverIdSet.has(entry.entityId)
      ) {
        await syncQueue.markSynced(entry.id);
      }
    }

    for (const serverPatient of serverPatients) {
      await patientLocalRepository.upsertFromServer(serverPatient);
    }

    // Remove local 'synced' rows that no longer exist on the server (deleted on another device)
    const syncedIds = await patientLocalRepository.listSyncedIds();
    for (const localId of syncedIds) {
      if (!serverIdSet.has(localId)) {
        await patientLocalRepository.hardDelete(localId);
      }
    }

    // Pull settings and pharmacists — persist locally for offline access
    const [settings, pharmacists] = await Promise.all([apiFetchSettings(), listPharmacists().catch(() => null)]);
    if (settings) {
      await settingsLocalRepository.saveSettings(settings);
    }
    if (pharmacists) {
      await pharmacistsLocalRepository.save(pharmacists);
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.patients.all });
  } finally {
    isRunning = false;
  }

  return { synced, conflicts };
}
