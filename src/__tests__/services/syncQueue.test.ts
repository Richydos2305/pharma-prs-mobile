import { enqueue, getPendingQueue, markSynced, markFailed, getPendingCount, coalescePatientDelete } from '../../services/syncQueue';

interface QueueRow {
  id: string;
  operationType: string;
  entityId: string;
  payload: string;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  failReason: string | null;
}

const queueStore = new Map<string, QueueRow>();

const mockDb = {
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  execAsync: jest.fn().mockResolvedValue(undefined),
  withTransactionAsync: jest.fn().mockImplementation((fn: () => Promise<void>) => fn())
};

jest.mock('../../services/db', () => ({
  getDb: jest.fn(() => mockDb)
}));

jest.mock('../../services/userSession', () => ({
  getCurrentUserId: () => 'test-user-id'
}));

describe('syncQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queueStore.clear();

    mockDb.runAsync.mockImplementation(async (sql: string, params: unknown[]) => {
      if (/INSERT INTO sync_queue/.test(sql)) {
        const [id, operationType, entityId, payload, timestamp] = params as [string, string, string, string, number];
        queueStore.set(id, { id, operationType, entityId, payload, timestamp, status: 'pending', failReason: null });
      } else if (/UPDATE sync_queue SET status = 'synced'/.test(sql)) {
        const row = queueStore.get(params[0] as string);
        if (row) row.status = 'synced';
      } else if (/UPDATE sync_queue SET status = 'failed'/.test(sql)) {
        const [reason, id] = params as [string, string];
        const row = queueStore.get(id);
        if (row) {
          row.status = 'failed';
          row.failReason = reason;
        }
      } else if (/UPDATE sync_queue SET operationType = 'DELETE_PATIENT'/.test(sql)) {
        const row = queueStore.get(params[0] as string);
        if (row) {
          row.operationType = 'DELETE_PATIENT';
          row.payload = '{}';
        }
      } else if (/DELETE FROM sync_queue WHERE id/.test(sql)) {
        queueStore.delete(params[0] as string);
      } else if (/UPDATE sync_queue SET entityId/.test(sql)) {
        const [newId, oldId] = params as [string, string];
        for (const row of queueStore.values()) {
          if (row.entityId === oldId && row.status === 'pending') row.entityId = newId;
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    });

    mockDb.getFirstAsync.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (/SELECT COUNT/.test(sql)) {
        return { count: Array.from(queueStore.values()).filter((r) => r.status === 'pending').length };
      }
      if (/status = 'pending'.*operationType IN/.test(sql)) {
        const entityId = (params as unknown[])[0] as string;
        return (
          Array.from(queueStore.values())
            .filter((r) => r.entityId === entityId && r.status === 'pending' && ['CREATE_PATIENT', 'UPDATE_PATIENT'].includes(r.operationType))
            .sort((a, b) => a.timestamp - b.timestamp)[0] ?? null
        );
      }
      if (/status = 'failed'.*operationType = 'CREATE_PATIENT'/.test(sql)) {
        const entityId = (params as unknown[])[0] as string;
        return (
          Array.from(queueStore.values()).find((r) => r.entityId === entityId && r.status === 'failed' && r.operationType === 'CREATE_PATIENT') ??
          null
        );
      }
      return null;
    });

    mockDb.getAllAsync.mockImplementation(async (sql: string) => {
      if (/status = 'pending'.*ORDER BY timestamp ASC/.test(sql)) {
        return Array.from(queueStore.values())
          .filter((r) => r.status === 'pending')
          .sort((a, b) => a.timestamp - b.timestamp);
      }
      return [];
    });
  });

  it('getPendingQueue returns all 3 enqueued operations ordered by timestamp ascending', async () => {
    await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e1', payload: { name: 'A' } });
    await enqueue({ operationType: 'UPDATE_PATIENT', entityId: 'e2', payload: { name: 'B' } });
    await enqueue({ operationType: 'DELETE_PATIENT', entityId: 'e3', payload: {} });

    const queue = await getPendingQueue();

    expect(queue).toHaveLength(3);
    expect(queue[0].timestamp).toBeLessThanOrEqual(queue[1].timestamp);
    expect(queue[1].timestamp).toBeLessThanOrEqual(queue[2].timestamp);
  });

  it('markSynced removes the entry from getPendingQueue', async () => {
    const id = await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e1', payload: {} });

    await markSynced(id);

    expect(await getPendingQueue()).toHaveLength(0);
  });

  it('markFailed removes the entry from getPendingQueue', async () => {
    const id = await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e1', payload: {} });

    await markFailed(id, 'Network error');

    expect(await getPendingQueue()).toHaveLength(0);
  });

  it('markFailed stores the failReason on the row', async () => {
    const id = await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e1', payload: {} });

    await markFailed(id, 'Network error');

    expect(queueStore.get(id)?.failReason).toBe('Network error');
  });

  describe('coalescePatientDelete', () => {
    it('returns cancelled_create and removes the entry when a pending CREATE exists', async () => {
      await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} });

      const result = await coalescePatientDelete('p1');

      expect(result).toBe('cancelled_create');
      expect(queueStore.size).toBe(0);
    });

    it('returns cancelled_create and removes the entry when a FAILED CREATE exists (patient never reached server)', async () => {
      const id = await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} });
      await markFailed(id, 'Pharmacist not found');

      const result = await coalescePatientDelete('p1');

      expect(result).toBe('cancelled_create');
      expect(queueStore.size).toBe(0);
    });

    it('returns new_delete and inserts a DELETE_PATIENT when no prior CREATE or UPDATE exists', async () => {
      const result = await coalescePatientDelete('p1');

      expect(result).toBe('new_delete');
      const entries = Array.from(queueStore.values());
      expect(entries).toHaveLength(1);
      expect(entries[0].operationType).toBe('DELETE_PATIENT');
    });
  });

  it('getPendingCount returns only the count of pending entries, not synced or failed', async () => {
    await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e1', payload: {} });
    await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e2', payload: {} });
    const id3 = await enqueue({ operationType: 'CREATE_PATIENT', entityId: 'e3', payload: {} });

    await markSynced(id3);

    expect(await getPendingCount()).toBe(2);
  });
});
