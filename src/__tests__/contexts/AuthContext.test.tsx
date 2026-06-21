import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';

jest.mock('../../api/auth', () => ({
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn()
}));

jest.mock('../../api/users', () => ({
  getMe: jest.fn()
}));

jest.mock('../../api/client', () => ({
  TOKEN_KEYS: { access: 'accessToken', refresh: 'refreshToken' },
  setLogoutCallback: jest.fn()
}));

import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout } from '../../api/auth';
import { getMe } from '../../api/users';
import { setLogoutCallback } from '../../api/client';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  });

  it('isLoading starts true and becomes false after bootstrap with no tokens', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('isAuthenticated is false when no tokens exist in SecureStore', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('isAuthenticated becomes true after login resolves', async () => {
    const mockUser = { _id: 'u1', email: 'a@b.com', fullName: 'Ada', role: 'Owner' };
    (apiLogin as jest.Mock).mockResolvedValueOnce({ accessToken: 'acc', refreshToken: 'ref' });
    (getMe as jest.Mock).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pass' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('logout sets isAuthenticated to false and deletes both SecureStore keys', async () => {
    const mockUser = { _id: 'u1', email: 'a@b.com', fullName: 'Ada', role: 'Owner' };
    (apiLogin as jest.Mock).mockResolvedValueOnce({ accessToken: 'acc', refreshToken: 'ref' });
    (getMe as jest.Mock).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pass' });
    });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
  });

  it('login throws and does not update user when the API call rejects', async () => {
    (apiLogin as jest.Mock).mockRejectedValueOnce(new Error('Bad credentials'));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('setLogoutCallback is called on mount', async () => {
    renderHook(() => useAuthContext(), { wrapper });

    await waitFor(() => {
      expect(setLogoutCallback).toHaveBeenCalledTimes(1);
      expect(setLogoutCallback).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  it('restores user from tokens on bootstrap when tokens exist', async () => {
    const mockUser = { _id: 'u1', email: 'a@b.com', fullName: 'Ada', role: 'Owner' };
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
    (getMe as jest.Mock).mockResolvedValueOnce(mockUser);

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });

  it('clears tokens and stays unauthenticated if getMe fails during bootstrap', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
    (getMe as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('accessToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
  });

  it('logout fires the API call with the stored refresh token', async () => {
    // bootstrap calls getItemAsync twice (access, refresh) → both null → skip user load
    // logout then calls getItemAsync for refresh → return 'stored-refresh'
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce('stored-refresh');
    (apiLogout as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(apiLogout).toHaveBeenCalledWith('stored-refresh');
  });
});
