import * as FileSystem from 'expo-file-system/legacy';
import type { QueryClient } from '@tanstack/react-query';

import { apiClient } from '../api/client';
import { apiEnqueueJob, apiGetJobStatus } from '../api/queue';
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

export async function run(queryClient: QueryClient): Promise<{ synced: number; conflicts: number }> {
  if (isRunning) return { synced: 0, conflicts: 0 };
  isRunning = true;

  let synced = 0;
  let conflicts = 0;

  try {
    const queue = await syncQueue.getPendingQueue();

    // ─── Phase 1: Enqueue all non-upload ops to BullMQ, then poll ───────────────
    const jobEntryMap = new Map<string, QueueEntry>(); // jobId → queue entry
    const failedEntityIds = new Set<string>();
    let pushAborted = false;

    for (const entry of queue) {
      if (entry.operationType === 'UPLOAD_FILE') continue;
      if (pushAborted) break;

      try {
        let data: object;
        const payload = entry.payload as Record<string, unknown>;

        if (entry.operationType === 'CREATE_PATIENT') {
          data = { _id: entry.entityId, ...payload };
        } else if (entry.operationType === 'UPDATE_PATIENT') {
          data = { id: entry.entityId, body: payload };
        } else if (entry.operationType === 'DELETE_PATIENT') {
          data = { id: entry.entityId };
        } else {
          // DELETE_FILE — payload is { publicId }
          data = payload;
        }

        const { jobId } = await apiEnqueueJob(entry.operationType, entry.entityId, data);
        jobEntryMap.set(jobId, entry);
      } catch {
        pushAborted = true;
        failedEntityIds.add(entry.entityId);
      }
    }

    // Poll until all enqueued jobs complete, fail, or timeout
    if (jobEntryMap.size > 0) {
      const pendingJobIds = new Set(jobEntryMap.keys());
      const TIMEOUT_MS = 30_000;
      const POLL_INTERVAL_MS = 500;
      const deadline = Date.now() + TIMEOUT_MS;

      while (pendingJobIds.size > 0 && Date.now() < deadline) {
        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        for (const jobId of [...pendingJobIds]) {
          try {
            const { status, error } = await apiGetJobStatus(jobId);
            if (status === 'completed' || status === 'failed') {
              pendingJobIds.delete(jobId);
              const entry = jobEntryMap.get(jobId)!;

              if (status === 'failed') {
                failedEntityIds.add(entry.entityId);
                await syncQueue.markFailed(entry.id, error ?? 'Job failed');
                conflicts++;
              } else {
                if (entry.operationType === 'DELETE_PATIENT') {
                  await patientLocalRepository.hardDelete(entry.entityId);
                }
                await syncQueue.markSynced(entry.id);
                synced++;
              }
            }
          } catch {
            // transient poll error — retry next iteration
          }
        }
      }

      // Any jobs still pending after timeout
      for (const jobId of pendingJobIds) {
        const entry = jobEntryMap.get(jobId)!;
        failedEntityIds.add(entry.entityId);
        await syncQueue.markFailed(entry.id, 'Sync timeout');
        conflicts++;
      }
    }

    // ─── Phase 2: File uploads ───────────────────────────────────────────────────
    for (const entry of queue) {
      if (entry.operationType !== 'UPLOAD_FILE') continue;
      // Skip if the patient's Phase 1 job failed — patient doesn't exist on server yet
      if (failedEntityIds.has(entry.entityId)) continue;

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
