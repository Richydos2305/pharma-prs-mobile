import { insertOrReplace, getLocalById, upsertFromServer, softMarkDeleted, hardDelete, listLocal } from '../../services/patientLocalRepository';
import type { IPatient } from '../../types';

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
  syncStatus: string;
}

const patientStore = new Map<string, PatientRow>();

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

function makePatient(overrides: Partial<IPatient> = {}): IPatient {
  return {
    id: 'patient-1',
    userId: 'user-1',
    fullName: 'John Doe',
    age: 30,
    phoneNumber: '07000000001',
    pharmacistName: ['Dr Smith'],
    customFields: { sections: [] },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('patientLocalRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    patientStore.clear();

    mockDb.runAsync.mockImplementation(async (sql: string, params: unknown[]) => {
      if (/INSERT OR REPLACE INTO patients/.test(sql)) {
        const [_id, userId, fullName, age, phoneNumber, pharmacistName, customFields, formSnapshot, createdAt, updatedAt, syncStatus] = params as [
          string,
          string,
          string,
          number,
          string,
          string,
          string,
          string | null,
          string,
          string,
          string
        ];
        patientStore.set(_id, {
          _id,
          userId,
          fullName,
          age,
          phoneNumber,
          pharmacistName,
          customFields,
          formSnapshot,
          createdAt,
          updatedAt,
          syncStatus
        });
      } else if (/DELETE FROM patients WHERE _id/.test(sql)) {
        patientStore.delete(params[0] as string);
      } else if (/UPDATE patients SET syncStatus = 'pending_delete'/.test(sql)) {
        const row = patientStore.get(params[0] as string);
        if (row) row.syncStatus = 'pending_delete';
      }
      return { lastInsertRowId: 0, changes: 1 };
    });

    mockDb.getFirstAsync.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (/SELECT \* FROM patients WHERE _id/.test(sql)) {
        return patientStore.get((params as unknown[])[0] as string) ?? null;
      }
      if (/SELECT updatedAt, syncStatus FROM patients WHERE _id/.test(sql)) {
        const row = patientStore.get((params as unknown[])[0] as string);
        return row ? { updatedAt: row.updatedAt, syncStatus: row.syncStatus } : null;
      }
      return null;
    });

    mockDb.getAllAsync.mockImplementation(async (sql: string) => {
      if (/syncStatus != 'pending_delete'/.test(sql)) {
        return Array.from(patientStore.values()).filter((r) => r.syncStatus !== 'pending_delete');
      }
      return [];
    });
  });

  describe('insertOrReplace / getLocalById', () => {
    it('maps _id to id on the returned patient', async () => {
      await insertOrReplace(makePatient({ id: 'p-abc' }), 'synced');

      const result = await getLocalById('p-abc');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('p-abc');
    });

    it('does not expose _id on the returned object', async () => {
      await insertOrReplace(makePatient({ id: 'p-abc' }), 'synced');

      const result = await getLocalById('p-abc');

      expect((result as unknown as Record<string, unknown>)?._id).toBeUndefined();
    });

    it('round-trips pharmacistName array through JSON correctly', async () => {
      await insertOrReplace(makePatient({ id: 'p-json', pharmacistName: ['Dr A', 'Dr B'] }), 'synced');

      const result = await getLocalById('p-json');

      expect(Array.isArray(result?.pharmacistName)).toBe(true);
      expect(result?.pharmacistName).toEqual(['Dr A', 'Dr B']);
    });
  });

  describe('upsertFromServer', () => {
    it('overwrites a pending_update row when server updatedAt is newer (poll-then-pull: server state is authoritative after jobs confirm)', async () => {
      await insertOrReplace(makePatient({ id: 'p1', fullName: 'Local Name', updatedAt: '2024-01-01T00:00:00.000Z' }), 'pending_update');

      await upsertFromServer(makePatient({ id: 'p1', fullName: 'Server Name', updatedAt: '2024-12-01T00:00:00.000Z' }));

      const result = await getLocalById('p1');
      expect(result?.fullName).toBe('Server Name');
    });

    it('overwrites a synced row when server updatedAt is newer', async () => {
      await insertOrReplace(makePatient({ id: 'p2', fullName: 'Old Name', updatedAt: '2024-01-01T00:00:00.000Z' }), 'synced');

      await upsertFromServer(makePatient({ id: 'p2', fullName: 'New Name', updatedAt: '2024-12-01T00:00:00.000Z' }));

      const result = await getLocalById('p2');
      expect(result?.fullName).toBe('New Name');
    });
  });

  describe('softMarkDeleted', () => {
    it('sets syncStatus to pending_delete in the store', async () => {
      await insertOrReplace(makePatient({ id: 'p3' }), 'synced');

      await softMarkDeleted('p3');

      expect(patientStore.get('p3')?.syncStatus).toBe('pending_delete');
    });

    it('calls runAsync with the correct SQL and patient id', async () => {
      await insertOrReplace(makePatient({ id: 'p3' }), 'synced');
      jest.clearAllMocks();
      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 0, changes: 1 });

      await softMarkDeleted('p3');

      expect(mockDb.runAsync).toHaveBeenCalledWith("UPDATE patients SET syncStatus = 'pending_delete' WHERE _id = ? AND userId = ?", [
        'p3',
        'test-user-id'
      ]);
    });
  });

  describe('hardDelete', () => {
    it('removes the row so getLocalById returns null', async () => {
      await insertOrReplace(makePatient({ id: 'p4' }), 'synced');

      await hardDelete('p4');

      expect(await getLocalById('p4')).toBeNull();
    });
  });

  describe('listLocal', () => {
    it('excludes rows with syncStatus pending_delete', async () => {
      await insertOrReplace(makePatient({ id: 'visible', fullName: 'Visible' }), 'synced');
      await insertOrReplace(makePatient({ id: 'hidden', fullName: 'Hidden' }), 'pending_delete');

      const results = await listLocal();

      expect(results.map((p) => p.id)).toContain('visible');
      expect(results.map((p) => p.id)).not.toContain('hidden');
    });
  });
});
