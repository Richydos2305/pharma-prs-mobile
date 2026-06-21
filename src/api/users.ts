import type { ImagePickerAsset } from 'expo-image-picker';
import { apiClient } from './client';
import type { IUser } from '../types';

export async function getMe(): Promise<IUser> {
  const { data } = await apiClient.get<{ data: IUser }>('/api/users/profile');
  return data.data;
}

export async function updateMe(payload: Partial<IUser>): Promise<IUser> {
  const { data } = await apiClient.put<{ data: IUser }>('/api/users/profile', payload);
  return data.data;
}

export async function uploadLogo(asset: ImagePickerAsset): Promise<IUser> {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: asset.mimeType ?? 'image/jpeg',
    name: asset.fileName ?? 'logo.jpg'
  } as unknown as Blob);
  const { data } = await apiClient.post<{ data: IUser }>('/api/users/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data;
}
