import type { ImagePickerAsset } from 'expo-image-picker';
import { apiClient } from './client';
import type { FileMetadata, IPatient, CreatePatientPayload, UpdatePatientPayload } from '../types';

export type { FileMetadata };

export interface ListPatientsParams {
  search?: string;
  sort?: string;
  age?: string;
}

export async function listPatients(params?: ListPatientsParams): Promise<IPatient[]> {
  const { data } = await apiClient.get<{ data: { patients: IPatient[]; total: number } }>('/api/patients', { params });
  return data.data.patients;
}

export async function getPatient(id: string): Promise<IPatient> {
  const { data } = await apiClient.get<{ data: IPatient }>(`/api/patients/${id}`);
  return data.data;
}

export async function createPatient(payload: CreatePatientPayload): Promise<IPatient> {
  const { data } = await apiClient.post<{ data: IPatient }>('/api/patients', payload);
  return data.data;
}

export async function updatePatient(id: string, payload: UpdatePatientPayload): Promise<IPatient> {
  const { data } = await apiClient.put<{ data: IPatient }>(`/api/patients/${id}`, payload);
  return data.data;
}

export async function deletePatient(id: string): Promise<void> {
  await apiClient.delete(`/api/patients/${id}`);
}

export async function uploadPatientDocument(patientId: string, file: { uri: string; mimeType?: string; name: string }): Promise<FileMetadata> {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.mimeType ?? 'application/octet-stream',
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

export async function deletePatientFile(publicId: string): Promise<void> {
  await apiClient.delete(`/api/files/${encodeURIComponent(publicId)}`);
}

export async function getPatientFiles(patientId: string): Promise<FileMetadata[]> {
  const { data } = await apiClient.get<{ data: FileMetadata[] }>(`/api/files/patient/${patientId}`);
  return data.data;
}
