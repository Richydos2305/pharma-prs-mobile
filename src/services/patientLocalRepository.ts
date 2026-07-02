import type { IPatient } from '../types';
import { getDb } from './db';
import { getCurrentUserId } from './userSession';

export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

interface PatientRow {
  _id: string;
  userId: string;
  fullName: string;
  age: number;
  phoneNumber: string;
  pharmacistName: string;
  customFields: string;
  formSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

function rowToPatient(row: PatientRow): IPatient {
  return {
    id: row._id,
    userId: row.userId,
    fullName: row.fullName,
    age: row.age,
    phoneNumber: row.phoneNumber,
    pharmacistName: JSON.parse(row.pharmacistName) as string[],
    customFields: JSON.parse(row.customFields) as IPatient['customFields'],
    formSnapshot: row.formSnapshot ? (JSON.parse(row.formSnapshot) as Record<string, unknown>) : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function insertOrReplace(patient: IPatient, syncStatus: SyncStatus): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO patients
      (_id, userId, fullName, age, phoneNumber, pharmacistName, customFields, formSnapshot, createdAt, updatedAt, syncStatus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      patient.id,
      patient.userId,
      patient.fullName,
      patient.age,
      patient.phoneNumber,
      JSON.stringify(patient.pharmacistName),
      JSON.stringify(patient.customFields),
      patient.formSnapshot !== undefined ? JSON.stringify(patient.formSnapshot) : null,
      patient.createdAt,
      patient.updatedAt,
      syncStatus
    ]
  );
}

export async function updateLocal(id: string, patch: Partial<IPatient>, syncStatus: SyncStatus): Promise<void> {
  const existing = await getLocalById(id);
  if (!existing) return;
  const merged: IPatient = { ...existing, ...patch, id };
  await insertOrReplace(merged, syncStatus);
}

export async function softMarkDeleted(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync("UPDATE patients SET syncStatus = 'pending_delete' WHERE _id = ? AND userId = ?", [id, getCurrentUserId()]);
}

export async function hardDelete(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM patients WHERE _id = ? AND userId = ?', [id, getCurrentUserId()]);
}

export async function listLocal(): Promise<IPatient[]> {
  const db = getDb();
  const userId = getCurrentUserId();
  const rows = await db.getAllAsync<PatientRow>(
    "SELECT * FROM patients WHERE userId = ? AND syncStatus != 'pending_delete' ORDER BY updatedAt DESC",
    [userId]
  );
  return rows.map(rowToPatient);
}

export async function getLocalById(id: string): Promise<IPatient | null> {
  const db = getDb();
  const row = await db.getFirstAsync<PatientRow>('SELECT * FROM patients WHERE _id = ? AND userId = ?', [id, getCurrentUserId()]);
  return row ? rowToPatient(row) : null;
}

export async function upsertFromServer(serverPatient: IPatient): Promise<void> {
  const db = getDb();
  const row = await db.getFirstAsync<Pick<PatientRow, 'updatedAt' | 'syncStatus'>>('SELECT updatedAt, syncStatus FROM patients WHERE _id = ?', [
    serverPatient.id
  ]);
  if (!row) {
    await insertOrReplace(serverPatient, 'synced');
    return;
  }
  if (row.syncStatus === 'pending_delete') return;
  if (serverPatient.updatedAt > row.updatedAt) {
    await insertOrReplace(serverPatient, 'synced');
  }
}

export async function updateCustomFields(id: string, customFields: IPatient['customFields']): Promise<void> {
  const db = getDb();
  await db.runAsync('UPDATE patients SET customFields = ? WHERE _id = ? AND userId = ?', [JSON.stringify(customFields), id, getCurrentUserId()]);
}

export async function listPendingDeleteIds(): Promise<string[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ _id: string }>("SELECT _id FROM patients WHERE userId = ? AND syncStatus = 'pending_delete'", [
    getCurrentUserId()
  ]);
  return rows.map((r) => r._id);
}

export async function listSyncedIds(): Promise<string[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ _id: string }>("SELECT _id FROM patients WHERE userId = ? AND syncStatus = 'synced'", [getCurrentUserId()]);
  return rows.map((r) => r._id);
}
