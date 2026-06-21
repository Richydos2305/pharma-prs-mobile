import { apiClient, TOKEN_KEYS, setLogoutCallback } from '../../api/client';

describe('api/client module exports', () => {
  it('should export TOKEN_KEYS.access as accessToken', () => {
    expect(TOKEN_KEYS.access).toBe('accessToken');
  });

  it('should export TOKEN_KEYS.refresh as refreshToken', () => {
    expect(TOKEN_KEYS.refresh).toBe('refreshToken');
  });

  it('should export setLogoutCallback as a function', () => {
    expect(typeof setLogoutCallback).toBe('function');
  });

  it('should export apiClient with a get method', () => {
    expect(typeof apiClient.get).toBe('function');
  });

  it('should export apiClient with a post method', () => {
    expect(typeof apiClient.post).toBe('function');
  });

  it('should export apiClient with a put method', () => {
    expect(typeof apiClient.put).toBe('function');
  });

  it('should export apiClient with a delete method', () => {
    expect(typeof apiClient.delete).toBe('function');
  });

  it('should export apiClient with a patch method', () => {
    expect(typeof apiClient.patch).toBe('function');
  });
});
