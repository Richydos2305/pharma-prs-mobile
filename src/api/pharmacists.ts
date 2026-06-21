import { apiClient } from './client';
import type { IPharmacist } from '../types';

type RawPharmacist = Omit<IPharmacist, 'id'> & { _id: string };

function normalize(raw: RawPharmacist): IPharmacist {
  return { id: raw._id, name: raw.name, phoneNumber: raw.phoneNumber };
}

export async function listPharmacists(): Promise<IPharmacist[]> {
  const { data } = await apiClient.get<{ data: { pharmacists: RawPharmacist[]; total: number } }>('/api/pharmacists');
  return data.data.pharmacists.map(normalize);
}

export async function createPharmacist(payload: { name: string; phoneNumber?: string }): Promise<IPharmacist> {
  const { data } = await apiClient.post<{ data: RawPharmacist }>('/api/pharmacists', payload);
  return normalize(data.data);
}

export async function updatePharmacist(id: string, payload: { name?: string; phoneNumber?: string }): Promise<IPharmacist> {
  const { data } = await apiClient.put<{ data: RawPharmacist }>(`/api/pharmacists/${id}`, payload);
  return normalize(data.data);
}

export async function deletePharmacist(id: string): Promise<void> {
  await apiClient.delete(`/api/pharmacists/${id}`);
}
