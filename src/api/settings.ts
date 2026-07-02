import axios from 'axios';
import { apiClient } from './client';
import * as settingsLocalRepository from '../services/settingsLocalRepository';
import type { FormSchema } from '../types/formBuilder';
import type { OnboardingStatus } from '../types';

export interface SettingsData {
  formConfig?: {
    schema?: FormSchema;
  };
  onboarding?: OnboardingStatus;
}

export async function getSettings(): Promise<SettingsData | null> {
  try {
    const { data } = await apiClient.get<{ data: SettingsData }>('/api/settings');
    return data.data;
  } catch {
    return settingsLocalRepository.getSettings();
  }
}

export async function publishFormSchema(schema: FormSchema): Promise<void> {
  const { id, name, sections } = schema;
  const payload = { formConfig: { schema: { id, name, sections } } };
  // Settings are auto-created on the first GET /api/settings call, so we
  // always PATCH. If we somehow arrive here before any GET (edge case),
  // the 404 fallback creates the doc then patches.
  try {
    await apiClient.patch('/api/settings', payload);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      await apiClient.post('/api/settings');
      await apiClient.patch('/api/settings', payload);
    } else {
      throw err;
    }
  }
}
