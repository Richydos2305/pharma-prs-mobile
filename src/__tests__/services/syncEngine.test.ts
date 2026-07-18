import { run } from '../../services/syncEngine';
import { queryKeys } from '../../api/queryKeys';
import type { QueryClient } from '@tanstack/react-query';
import type { QueueEntry } from '../../services/syncQueue';
import type { IPatient } from '../../types';

jest.mock('../../services/syncQueue', () => ({
  getPendingQueue: jest.fn(),
  markSynced: jest.fn(),
  markFailed: jest.fn()
}));

jest.mock('../../services/patientLocalRepository', () => ({
  hardDelete: jest.fn(),
  insertOrReplace: jest.fn(),
  updateLocal: jest.fn(),
  listLocal: jest.fn(),
  getLocalById: jest.fn(),
  upsertFromServer: jest.fn(),
  listPendingDeleteIds: jest.fn(),
  listSyncedIds: jest.fn()
}));

jest.mock('../../services/settingsLocalRepository', () => ({
  saveSettings: jest.fn()
}));

jest.mock('../../api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

jest.mock('../../api/settings', () => ({
  getSettings: jest.fn()
}));

import * as syncQueue from '../../services/syncQueue';
import * as patientLocalRepository from '../../services/patientLocalRepository';
import { apiClient } from '../../api/client';

const mockQueryClient = {
  invalidateQueries: jest.fn()
} as unknown as QueryClient;

function makePatient(overrides: Partial<IPatient> = {}): IPatient {
  return {
    id: 'server-patient-1',
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

function makeQueueEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: 'q1',
    operationType: 'CREATE_PATIENT',
    entityId: 'local-id',
    payload: {},
    timestamp: 1000,
    status: 'pending',
    ...overrides
  };
}

function makeAxiosError(status: number, data?: { message?: string }) {
  return {
    isAxiosError: true,
    response: { status, data },
    message: `Request failed with status code ${status}`
  };
}

function makeNetworkError() {
  return new Error('Network Error');
}

describe('syncEngine.run', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([]);
    (syncQueue.markSynced as jest.Mock).mockResolvedValue(undefined);
    (syncQueue.markFailed as jest.Mock).mockResolvedValue(undefined);

    (patientLocalRepository.hardDelete as jest.Mock).mockResolvedValue(undefined);
    (patientLocalRepository.insertOrReplace as jest.Mock).mockResolvedValue(undefined);
    (patientLocalRepository.updateLocal as jest.Mock).mockResolvedValue(undefined);
    (patientLocalRepository.upsertFromServer as jest.Mock).mockResolvedValue(undefined);
    (patientLocalRepository.listSyncedIds as jest.Mock).mockResolvedValue([]);
    (patientLocalRepository.getLocalById as jest.Mock).mockResolvedValue(null);

    (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: { patients: [], total: 0 } } });
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { data: { url: 'https://cdn/file.pdf', publicId: 'pub123' } } });
    (apiClient.put as jest.Mock).mockResolvedValue(undefined);
    (apiClient.delete as jest.Mock).mockResolvedValue(undefined);

    (mockQueryClient.invalidateQueries as jest.Mock).mockResolvedValue(undefined);
  });

  describe('re-entrancy guard', () => {
    it('returns { synced: 0, conflicts: 0 } for the second concurrent call without processing anything', async () => {
      let resolveQueue!: (entries: QueueEntry[]) => void;
      (syncQueue.getPendingQueue as jest.Mock).mockReturnValueOnce(new Promise<QueueEntry[]>((resolve) => (resolveQueue = resolve)));

      const firstCall = run(mockQueryClient);
      const secondResult = await run(mockQueryClient);

      expect(secondResult).toEqual({ synced: 0, conflicts: 0 });
      expect(syncQueue.getPendingQueue).toHaveBeenCalledTimes(1);

      resolveQueue([]);
      await firstCall;
    });
  });

  describe('push phase — Phase 1 (direct REST)', () => {
    it('POSTs to /api/patients with _id set to the local id and marks synced', async () => {
      const payload = { fullName: 'John', age: 30, phoneNumber: '07000' };
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'local-id', payload })
      ]);

      await run(mockQueryClient);

      expect(apiClient.post).toHaveBeenCalledWith('/api/patients', { _id: 'local-id', ...payload });
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
    });

    it('PUTs to /api/patients/:id with the payload and marks synced', async () => {
      const payload = { fullName: 'Jane' };
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'UPDATE_PATIENT', entityId: 'p1', payload })
      ]);

      await run(mockQueryClient);

      expect(apiClient.put).toHaveBeenCalledWith('/api/patients/p1', payload);
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
    });

    it('DELETEs /api/patients/:id, hardDeletes locally, and marks synced', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'DELETE_PATIENT', entityId: 'p1', payload: {} })
      ]);

      await run(mockQueryClient);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/patients/p1');
      expect(patientLocalRepository.hardDelete).toHaveBeenCalledWith('p1');
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
    });

    it('DELETEs /api/files/:publicId with the publicId URL-encoded and marks synced', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({
          id: 'q1',
          operationType: 'DELETE_FILE',
          entityId: 'p1',
          payload: { publicId: 'patient-records/abc123' }
        })
      ]);

      await run(mockQueryClient);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/files/patient-records%2Fabc123');
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
    });

    it('marks failed with the server error message on a permanent (4xx) error', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} })
      ]);
      (apiClient.post as jest.Mock).mockRejectedValue(makeAxiosError(400, { message: 'Validation failed' }));

      const result = await run(mockQueryClient);

      expect(syncQueue.markFailed).toHaveBeenCalledWith('q1', 'Validation failed');
      expect(syncQueue.markSynced).not.toHaveBeenCalled();
      expect(result.conflicts).toBe(1);
    });

    it('leaves the entry pending (does not mark failed) after a transient error exhausts retries', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} })
      ]);
      (apiClient.post as jest.Mock).mockRejectedValue(makeNetworkError());

      const result = await run(mockQueryClient);

      expect(apiClient.post).toHaveBeenCalledTimes(3);
      expect(syncQueue.markFailed).not.toHaveBeenCalled();
      expect(syncQueue.markSynced).not.toHaveBeenCalled();
      expect(result.conflicts).toBe(0);
      expect(result.synced).toBe(0);
    }, 10000);

    it('retries a transient error and succeeds on a later attempt', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} })
      ]);
      (apiClient.post as jest.Mock).mockRejectedValueOnce(makeNetworkError()).mockResolvedValueOnce({ data: {} });

      await run(mockQueryClient);

      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
    });

    it('treats a 404 on DELETE_PATIENT as success (idempotent delete)', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'DELETE_PATIENT', entityId: 'p1', payload: {} })
      ]);
      (apiClient.delete as jest.Mock).mockRejectedValue(makeAxiosError(404));

      await run(mockQueryClient);

      expect(patientLocalRepository.hardDelete).toHaveBeenCalledWith('p1');
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
      expect(syncQueue.markFailed).not.toHaveBeenCalled();
    });

    it('treats a 404 on DELETE_FILE as success (idempotent delete)', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'DELETE_FILE', entityId: 'p1', payload: { publicId: 'pub123' } })
      ]);
      (apiClient.delete as jest.Mock).mockRejectedValue(makeAxiosError(404));

      await run(mockQueryClient);

      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
      expect(syncQueue.markFailed).not.toHaveBeenCalled();
    });

    it('processes each entry independently — one entry failing permanently does not block others', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'e1', timestamp: 1, payload: {} }),
        makeQueueEntry({ id: 'q2', operationType: 'UPDATE_PATIENT', entityId: 'e2', timestamp: 2, payload: { fullName: 'X' } })
      ]);
      (apiClient.post as jest.Mock).mockRejectedValue(makeAxiosError(400, { message: 'Bad request' }));

      await run(mockQueryClient);

      expect(apiClient.put).toHaveBeenCalledWith('/api/patients/e2', { fullName: 'X' });
      expect(syncQueue.markFailed).toHaveBeenCalledWith('q1', 'Bad request');
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q2');
    });
  });

  describe('push phase — Phase 2 (file uploads)', () => {
    it('uploads file, PUTs updated customFields, and marks synced', async () => {
      const patient = makePatient({
        id: 'p1',
        customFields: {
          sections: [{ name: 'Docs', fields: [{ doc: [{ pending: true, localPath: '/tmp/f.pdf', fileName: 'f.pdf' }] }] }]
        }
      });
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({
          id: 'q1',
          operationType: 'UPLOAD_FILE',
          entityId: 'p1',
          payload: { localPath: '/tmp/f.pdf', fileName: 'f.pdf', mimeType: 'application/pdf' }
        })
      ]);
      (patientLocalRepository.getLocalById as jest.Mock).mockResolvedValue(patient);

      await run(mockQueryClient);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/files/upload/p1',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
      );
      expect(apiClient.put).toHaveBeenCalledWith('/api/patients/p1', expect.objectContaining({ customFields: expect.any(Object) }));
      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
    });

    it('skips UPLOAD_FILE and leaves it in queue when the patient Phase 1 op did not sync', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} }),
        makeQueueEntry({
          id: 'q2',
          operationType: 'UPLOAD_FILE',
          entityId: 'p1',
          payload: { localPath: '/tmp/f.pdf', fileName: 'f.pdf', mimeType: 'application/pdf' }
        })
      ]);
      (apiClient.post as jest.Mock).mockRejectedValue(makeAxiosError(400, { message: 'Error' }));

      await run(mockQueryClient);

      // CREATE_PATIENT marked failed, UPLOAD_FILE silently skipped (left as pending for retry)
      expect(syncQueue.markFailed).toHaveBeenCalledTimes(1);
      expect(syncQueue.markFailed).toHaveBeenCalledWith('q1', 'Error');
      expect(syncQueue.markSynced).not.toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('pull phase', () => {
    it('calls upsertFromServer for each patient returned by the server', async () => {
      const serverPatient = makePatient({ id: 'sp1' });
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: { patients: [serverPatient], total: 1 } } });

      await run(mockQueryClient);

      expect(patientLocalRepository.upsertFromServer).toHaveBeenCalledWith(serverPatient);
    });

    it('hardDeletes a local synced patient that the server no longer returns', async () => {
      (patientLocalRepository.listSyncedIds as jest.Mock).mockResolvedValue(['orphaned-id']);

      await run(mockQueryClient);

      expect(patientLocalRepository.hardDelete).toHaveBeenCalledWith('orphaned-id');
    });

    it('does not delete a local patient with pending status that is absent from the server', async () => {
      (patientLocalRepository.listSyncedIds as jest.Mock).mockResolvedValue([]);

      await run(mockQueryClient);

      expect(patientLocalRepository.hardDelete).not.toHaveBeenCalled();
    });

    it('self-heals a CREATE_PATIENT entry whose response was lost but the patient exists on the server', async () => {
      (syncQueue.getPendingQueue as jest.Mock).mockResolvedValue([
        makeQueueEntry({ id: 'q1', operationType: 'CREATE_PATIENT', entityId: 'p1', payload: {} })
      ]);
      (apiClient.post as jest.Mock).mockRejectedValue(makeNetworkError());
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { data: { patients: [makePatient({ id: 'p1' })], total: 1 } } });

      await run(mockQueryClient);

      expect(syncQueue.markSynced).toHaveBeenCalledWith('q1');
      expect(syncQueue.markFailed).not.toHaveBeenCalled();
    }, 10000);
  });

  describe('post-sync', () => {
    it('invalidates the patients query after a successful run', async () => {
      await run(mockQueryClient);

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.patients.all });
    });
  });
});
