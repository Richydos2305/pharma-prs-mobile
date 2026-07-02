import * as FileSystem from 'expo-file-system/legacy';
import { generateLocalId } from '../services/localId';
import type { ImagePickerAsset } from 'expo-image-picker';
import { normalizeUploadMimeType } from '../utils/mimeType';

import { apiClient } from './client';
import type { CreatePatientPayload, FileMetadata, IPatient, PendingFileRef, UpdatePatientPayload } from '../types';
import * as patientLocalRepository from '../services/patientLocalRepository';
import * as settingsLocalRepository from '../services/settingsLocalRepository';
import * as syncQueue from '../services/syncQueue';

export type { FileMetadata };

export interface ListPatientsParams {
  search?: string;
  sort?: string;
  age?: string;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function removeFileRef(customFields: IPatient['customFields'], publicId: string): IPatient['customFields'] {
  // Guard: a falsy publicId would match every PendingFileRef (they have no publicId), wiping them all.
  if (!publicId) return customFields;
  const sections = customFields.sections.map((section) => ({
    ...section,
    fields: section.fields.map((row) => {
      const updated: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (Array.isArray(val)) {
          updated[key] = val.filter((item) => {
            if (typeof item !== 'object' || item === null) return true;
            return (item as { publicId?: string }).publicId !== publicId;
          });
        } else {
          updated[key] = val;
        }
      }
      return updated;
    })
  }));
  return { sections };
}

function removePendingFileRef(customFields: IPatient['customFields'], localPath: string): IPatient['customFields'] {
  const sections = customFields.sections.map((section) => ({
    ...section,
    fields: section.fields.map((row) => {
      const updated: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        if (Array.isArray(val)) {
          updated[key] = val.filter((item) => {
            if (typeof item !== 'object' || item === null) return true;
            const ref = item as Partial<PendingFileRef>;
            return !(ref.pending === true && ref.localPath === localPath);
          });
        } else {
          updated[key] = val;
        }
      }
      return updated;
    })
  }));
  return { sections };
}

export async function cancelQueuedFileUpload(patientId: string, localPath: string): Promise<void> {
  await syncQueue.cancelPendingUpload(patientId, localPath);
  const patient = await patientLocalRepository.getLocalById(patientId);
  if (patient) {
    await patientLocalRepository.updateCustomFields(patientId, removePendingFileRef(patient.customFields, localPath));
  }
  await FileSystem.deleteAsync(localPath, { idempotent: true });
}

function extractPharmacistNames(customFields?: CreatePatientPayload['customFields']): string[] {
  if (!customFields) return [];
  const names: string[] = [];
  for (const section of customFields.sections) {
    for (const fields of section.fields) {
      const value = fields['core-attended-to-by'];
      if (typeof value === 'string' && value.trim() !== '') {
        names.push(value);
      }
    }
  }
  return names;
}

// ─── Local-first public API ───────────────────────────────────────────────────

export async function listPatients(): Promise<IPatient[]> {
  return patientLocalRepository.listLocal();
}

export async function getPatient(id: string): Promise<IPatient> {
  const local = await patientLocalRepository.getLocalById(id);
  if (!local) throw new Error(`Patient ${id} not found locally`);
  return local;
}

export async function createPatient(payload: CreatePatientPayload, userId: string): Promise<IPatient> {
  const localId = generateLocalId();
  const now = new Date().toISOString();
  const settings = await settingsLocalRepository.getSettings();

  const localPatient: IPatient = {
    id: localId,
    userId,
    fullName: payload.fullName,
    age: payload.age,
    phoneNumber: payload.phoneNumber,
    pharmacistName: extractPharmacistNames(payload.customFields),
    customFields: payload.customFields ?? { sections: [] },
    formSnapshot: settings?.formConfig?.schema as unknown as Record<string, unknown> | undefined,
    createdAt: now,
    updatedAt: now
  };

  await patientLocalRepository.insertOrReplace(localPatient, 'pending_create');
  await syncQueue.enqueue({
    operationType: 'CREATE_PATIENT',
    entityId: localId,
    payload
  });

  return localPatient;
}

export async function updatePatient(id: string, payload: UpdatePatientPayload): Promise<IPatient> {
  const patch: Partial<IPatient> = {
    ...payload,
    ...(payload.customFields !== undefined ? { pharmacistName: extractPharmacistNames(payload.customFields) } : {})
  };
  await patientLocalRepository.updateLocal(id, patch, 'pending_update');
  await syncQueue.coalescePatientUpdate(id, payload);
  const updated = await patientLocalRepository.getLocalById(id);
  if (!updated) throw new Error(`Patient ${id} not found`);
  return updated;
}

export async function deletePatient(id: string): Promise<void> {
  // Cancel any queued file uploads before touching the patient record.
  const localPaths = await syncQueue.cancelAllPendingUploads(id);
  await Promise.all(localPaths.map((p) => FileSystem.deleteAsync(p, { idempotent: true })));

  const result = await syncQueue.coalescePatientDelete(id);
  if (result === 'cancelled_create') {
    // Patient never reached the server — no server op needed, remove locally.
    await patientLocalRepository.hardDelete(id);
  } else {
    await patientLocalRepository.softMarkDeleted(id);
  }
}

export async function queueFileUpload(patientId: string, file: { uri: string; fileName: string; mimeType: string }): Promise<void> {
  const dir = `${FileSystem.documentDirectory ?? ''}pending-uploads/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const localPath = `${dir}${generateLocalId()}_${file.fileName}`;
  await FileSystem.copyAsync({ from: file.uri, to: localPath });

  await syncQueue.enqueue({
    operationType: 'UPLOAD_FILE',
    entityId: patientId,
    payload: { localPath, fileName: file.fileName, mimeType: file.mimeType }
  });
}

// ─── File operations — always remote, no local-first needed ──────────────────

export async function uploadPatientDocument(patientId: string, file: { uri: string; mimeType?: string; name: string }): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: normalizeUploadMimeType(file.mimeType ?? 'application/octet-stream'),
    name: file.name
  } as unknown as Blob);
  const { data } = await apiClient.post<{ data: { url: string; publicId: string } }>(`/api/files/upload/${patientId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return { url: data.data.url, publicId: data.data.publicId, name: file.name };
}

export async function uploadPatientFile(patientId: string, asset: ImagePickerAsset): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.mimeType ?? 'image/jpeg',
    name: asset.fileName ?? 'file.jpg'
  } as unknown as Blob);
  const { data } = await apiClient.post<{ data: { url: string; publicId: string } }>(`/api/files/upload/${patientId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return { url: data.data.url, publicId: data.data.publicId, name: asset.fileName ?? 'file.jpg' };
}

export async function deletePatientFile(patientId: string, publicId: string): Promise<void> {
  const patient = await patientLocalRepository.getLocalById(patientId);
  if (patient) {
    await patientLocalRepository.updateCustomFields(patientId, removeFileRef(patient.customFields, publicId));
  }
  await syncQueue.enqueue({ operationType: 'DELETE_FILE', entityId: patientId, payload: { publicId } });
}

export async function getPatientFiles(patientId: string): Promise<FileMetadata[]> {
  const { data } = await apiClient.get<{ data: FileMetadata[] }>(`/api/files/patient/${patientId}`);
  return data.data;
}
