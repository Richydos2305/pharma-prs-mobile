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
import { publishFormSchema } from '../../api/settings';

const createSchema = () => ({
  id: 's1',
  name: 'Test Form',
  status: 'draft' as const,
  sections: []
});

describe('settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publishFormSchema', () => {
    it('should call only PATCH when settings already exist (normal case)', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({ data: {} });

      await publishFormSchema(createSchema());

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(apiClient.patch).toHaveBeenCalledTimes(1);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/settings', expect.anything());
    });

    it('should call POST then PATCH when settings do not exist yet (404 fallback)', async () => {
      const notFound = { response: { status: 404 }, isAxiosError: true };
      (apiClient.patch as jest.Mock).mockRejectedValueOnce(notFound).mockResolvedValueOnce({ data: {} });
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await publishFormSchema(createSchema());

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/settings');
      expect(apiClient.patch).toHaveBeenCalledTimes(2);
    });

    it('should not persist the status field in the PATCH body', async () => {
      (apiClient.patch as jest.Mock).mockResolvedValueOnce({ data: {} });

      await publishFormSchema(createSchema());

      const patchBody = (apiClient.patch as jest.Mock).mock.calls[0][1] as {
        formConfig: { schema: { id: string; name: string; sections: unknown[]; status?: string } };
      };

      expect(patchBody.formConfig.schema).toEqual({ id: 's1', name: 'Test Form', sections: [] });
      expect(patchBody.formConfig.schema.status).toBeUndefined();
    });
  });
});
