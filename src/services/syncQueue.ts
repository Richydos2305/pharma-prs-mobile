import { generateLocalId } from './localId';
import { getDb } from './db';
import { getCurrentUserId } from './userSession';

export type OperationType = 'CREATE_PATIENT' | 'UPDATE_PATIENT' | 'DELETE_PATIENT' | 'UPLOAD_FILE' | 'DELETE_FILE';

export interface QueueEntry {
  id: string;
  operationType: OperationType;
  entityId: string;
  payload: object;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  failReason?: string;
}

interface QueueRow {
  id: string;
  operationType: OperationType;
  entityId: string;
  payload: string;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  failReason: string | null;
}

function rowToEntry(row: QueueRow): QueueEntry {
  return {
    id: row.id,
    operationType: row.operationType,
    entityId: row.entityId,
    payload: JSON.parse(row.payload) as object,
    timestamp: row.timestamp,
    status: row.status,
    failReason: row.failReason ?? undefined
  };
}

export async function enqueue(op: Omit<QueueEntry, 'id' | 'timestamp' | 'status'>): Promise<string> {
  if (typeof op.payload !== 'object' || op.payload === null || Array.isArray(op.payload)) {
    throw new Error('syncQueue.enqueue: payload must be a plain object');
  }
  const db = getDb();
  const id = generateLocalId();
  const timestamp = Date.now();
  await db.runAsync(
    `INSERT INTO sync_queue (id, operationType, entityId, payload, timestamp, status, userId)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [id, op.operationType, op.entityId, JSON.stringify(op.payload), timestamp, getCurrentUserId()]
  );
  return id;
}

export async function getPendingQueue(): Promise<QueueEntry[]> {
  const db = getDb();
  const rows = await db.getAllAsync<QueueRow>("SELECT * FROM sync_queue WHERE status = 'pending' AND userId = ? ORDER BY timestamp ASC", [
    getCurrentUserId()
  ]);
  return rows.map(rowToEntry);
}

export async function markSynced(id: string): Promise<void> {
  const db = getDb();
  await db.runAsync("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [id]);
}

export async function markFailed(id: string, reason: string): Promise<void> {
  const db = getDb();
  await db.runAsync("UPDATE sync_queue SET status = 'failed', failReason = ? WHERE id = ?", [reason, id]);
}

export async function getPendingCount(): Promise<number> {
  const db = getDb();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending' AND userId = ?", [
    getCurrentUserId()
  ]);
  return row?.count ?? 0;
}

// Finds the most recent pending CREATE or UPDATE for a patient.
async function findPendingPatientOp(entityId: string): Promise<QueueRow | null> {
  const db = getDb();
  return db.getFirstAsync<QueueRow>(
    "SELECT * FROM sync_queue WHERE entityId = ? AND userId = ? AND status = 'pending' AND operationType IN ('CREATE_PATIENT', 'UPDATE_PATIENT') ORDER BY timestamp ASC LIMIT 1",
    [entityId, getCurrentUserId()]
  );
}

// Merges an update into an existing pending CREATE/UPDATE, or inserts a new UPDATE.
export async function coalescePatientUpdate(entityId: string, newPayload: object): Promise<void> {
  const db = getDb();
  const existing = await findPendingPatientOp(entityId);
  if (!existing) {
    await enqueue({ operationType: 'UPDATE_PATIENT', entityId, payload: newPayload });
    return;
  }
  if (existing.operationType === 'CREATE_PATIENT') {
    const merged = { ...(JSON.parse(existing.payload) as object), ...newPayload };
    await db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [JSON.stringify(merged), existing.id]);
  } else {
    const merged = { ...(JSON.parse(existing.payload) as object), ...newPayload };
    await db.runAsync('UPDATE sync_queue SET payload = ? WHERE id = ?', [JSON.stringify(merged), existing.id]);
  }
}

export type DeleteCoalesceResult = 'cancelled_create' | 'replaced_update' | 'new_delete';

// Cancels a pending CREATE, replaces a pending UPDATE with DELETE, or inserts a new DELETE.
export async function coalescePatientDelete(entityId: string): Promise<DeleteCoalesceResult> {
  const db = getDb();
  const existing = await findPendingPatientOp(entityId);
  if (!existing) {
    // Also check for a failed CREATE — patient never reached the server, so no server op needed.
    const failedCreate = await db.getFirstAsync<QueueRow>(
      "SELECT * FROM sync_queue WHERE entityId = ? AND userId = ? AND status = 'failed' AND operationType = 'CREATE_PATIENT' LIMIT 1",
      [entityId, getCurrentUserId()]
    );
    if (failedCreate) {
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [failedCreate.id]);
      return 'cancelled_create';
    }
    await enqueue({ operationType: 'DELETE_PATIENT', entityId, payload: {} });
    return 'new_delete';
  }
  if (existing.operationType === 'CREATE_PATIENT') {
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [existing.id]);
    return 'cancelled_create';
  }
  await db.runAsync("UPDATE sync_queue SET operationType = 'DELETE_PATIENT', payload = '{}' WHERE id = ?", [existing.id]);
  return 'replaced_update';
}

// Cancels all pending UPLOAD_FILE entries for a patient. Returns the localPaths for cleanup.
export async function cancelAllPendingUploads(entityId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db.getAllAsync<QueueRow>(
    "SELECT * FROM sync_queue WHERE entityId = ? AND userId = ? AND operationType = 'UPLOAD_FILE' AND status = 'pending'",
    [entityId, getCurrentUserId()]
  );
  const localPaths: string[] = [];
  for (const row of rows) {
    const payload = JSON.parse(row.payload) as { localPath?: string };
    if (payload.localPath) localPaths.push(payload.localPath);
    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [row.id]);
  }
  return localPaths;
}

// Cancels a single pending UPLOAD_FILE for a patient by localPath. Returns true if found and cancelled.
export async function cancelPendingUpload(entityId: string, localPath: string): Promise<boolean> {
  const db = getDb();
  const rows = await db.getAllAsync<QueueRow>(
    "SELECT * FROM sync_queue WHERE entityId = ? AND userId = ? AND operationType = 'UPLOAD_FILE' AND status = 'pending'",
    [entityId, getCurrentUserId()]
  );
  for (const row of rows) {
    const payload = JSON.parse(row.payload) as { localPath?: string };
    if (payload.localPath === localPath) {
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [row.id]);
      return true;
    }
  }
  return false;
}
