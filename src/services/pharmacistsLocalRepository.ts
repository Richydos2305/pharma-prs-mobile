import type { IPharmacist } from '../types';
import { getDb } from './db';
import { getCurrentUserId } from './userSession';

export async function save(pharmacists: IPharmacist[]): Promise<void> {
  const db = getDb();
  await db.runAsync('INSERT OR REPLACE INTO app_pharmacists (userId, data) VALUES (?, ?)', [getCurrentUserId(), JSON.stringify(pharmacists)]);
}

export async function list(): Promise<IPharmacist[]> {
  const db = getDb();
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM app_pharmacists WHERE userId = ?', [getCurrentUserId()]);
  return row ? (JSON.parse(row.data) as IPharmacist[]) : [];
}
