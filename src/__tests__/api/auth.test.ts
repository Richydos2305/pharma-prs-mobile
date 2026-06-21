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
import { login, register, logout, verifyEmail, resendVerification, forgotPassword, resetPassword } from '../../api/auth';

describe('auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should call POST /api/auth/login with credentials and return tokens', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { accessToken: 'abc', refreshToken: 'xyz' } }
      });

      const result = await login({ email: 'a@b.com', password: 'pass' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'a@b.com',
        password: 'pass'
      });
      expect(result).toEqual({ accessToken: 'abc', refreshToken: 'xyz' });
    });
  });

  describe('register', () => {
    it('should call POST /api/auth/register with payload and return the response message', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { data: { message: 'ok' } }
      });

      const result = await register({ email: 'a@b.com', password: 'pass', fullName: 'Ada Lovelace' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/register', {
        email: 'a@b.com',
        password: 'pass',
        fullName: 'Ada Lovelace'
      });
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('logout', () => {
    it('should call POST /api/auth/logout with the refresh token', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await logout('refresh-token');

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout', { token: 'refresh-token' });
    });
  });

  describe('verifyEmail', () => {
    it('should call POST /api/auth/verify-email with the token', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await verifyEmail({ token: 't' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/verify-email', { token: 't' });
    });
  });

  describe('resendVerification', () => {
    it('should call POST /api/auth/resend-verification with the email', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await resendVerification({ email: 'a@b.com' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/resend-verification', { email: 'a@b.com' });
    });
  });

  describe('forgotPassword', () => {
    it('should call POST /api/auth/forgot-password with the email', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await forgotPassword({ email: 'a@b.com' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'a@b.com' });
    });
  });

  describe('resetPassword', () => {
    it('should call POST /api/auth/reset-password with the token and new password', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({ data: {} });

      await resetPassword({ token: 't', newPassword: 'p' });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 't',
        newPassword: 'p'
      });
    });
  });
});
