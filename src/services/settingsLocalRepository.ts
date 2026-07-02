import type { SettingsData } from '../api/settings';
import { getDb } from './db';
import { getCurrentUserId } from './userSession';

export async function saveSettings(data: SettingsData): Promise<void> {
  const db = getDb();
  await db.runAsync('INSERT OR REPLACE INTO app_settings (userId, data) VALUES (?, ?)', [getCurrentUserId(), JSON.stringify(data)]);
}

export async function getSettings(): Promise<SettingsData | null> {
  const db = getDb();
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM app_settings WHERE userId = ?', [getCurrentUserId()]);
  return row ? (JSON.parse(row.data) as SettingsData) : null;
}
