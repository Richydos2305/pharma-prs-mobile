jest.mock('../../api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  },
  TOKEN_KEYS: { access: 'accessToken', refresh: 'refreshToken' },
  setLogoutCallback: jest.fn()
}));

import { apiClient } from '../../api/client';
import { listPharmacists, createPharmacist, updatePharmacist, deletePharmacist } from '../../api/pharmacists';

describe('pharmacists API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listPharmacists', () => {
    it('should return pharmacists with _id normalized to id', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { pharmacists: [{ _id: 'abc', name: 'Dr. John', phoneNumber: '0241234567' }], total: 1 } }
      });

      const result = await listPharmacists();

      expect(apiClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 'abc', name: 'Dr. John', phoneNumber: '0241234567' }]);
    });

    it('should return undefined phoneNumber when the API omits it', async () => {
      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: { data: { pharmacists: [{ _id: 'abc', name: 'Dr. John' }], total: 1 } }
      });

      const result = await listPharmacists();

      expect(result[0].phoneNumber).toBeUndefined();
    });
  });

  describe('createPharmacist', () => {
    it('should call POST and return the created pharmacist with _id normalized to id', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { _id: 'xyz', name: 'Dr. Jane', phoneNumber: '0557654321' } }
      });

      const result = await createPharmacist({ name: 'Dr. Jane', phoneNumber: '0557654321' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'xyz', name: 'Dr. Jane', phoneNumber: '0557654321' });
    });
  });

  describe('updatePharmacist', () => {
    it('should call PUT with the pharmacist id and return the updated pharmacist with id', async () => {
      (apiClient.put as jest.Mock).mockResolvedValueOnce({
        data: { data: { _id: 'xyz', name: 'Dr. Jane Updated', phoneNumber: '0557654321' } }
      });

      const result = await updatePharmacist('xyz', { name: 'Dr. Jane Updated' });

      expect(apiClient.put).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 'xyz' });
    });
  });

  describe('deletePharmacist', () => {
    it('should call DELETE with the pharmacist id and not throw', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValueOnce({});

      await expect(deletePharmacist('xyz')).resolves.not.toThrow();

      expect(apiClient.delete).toHaveBeenCalledTimes(1);
    });
  });
});
