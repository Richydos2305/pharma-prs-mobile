import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth';
import { getMe } from '../api/users';
import { TOKEN_KEYS, setLogoutCallback } from '../api/client';
import { setCurrentUserId, setOfflineWallCallback, setSyncReadyCallback } from '../services/userSession';
import type { IUser, LoginPayload, RegisterPayload } from '../types';

const USER_PROFILE_KEY = 'userProfile';

interface AuthContextValue {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresOnline: boolean;
  clearOfflineWall: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresOnline, setRequiresOnline] = useState(false);

  const clearOfflineWall = useCallback(() => setRequiresOnline(false), []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
      if (refreshToken) {
        apiLogout(refreshToken).catch(() => {});
      }
    } catch {
      // fire-and-forget; ignore logout API errors
    }
    await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
    await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
    await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
    setCurrentUserId('');
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutCallback(logout);
    setOfflineWallCallback(() => setRequiresOnline(true));
    setSyncReadyCallback(clearOfflineWall);

    async function bootstrap() {
      try {
        const accessToken = await SecureStore.getItemAsync(TOKEN_KEYS.access);
        const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
        if (accessToken && refreshToken) {
          // Restore from cache first so the app works immediately offline
          const cached = await SecureStore.getItemAsync(USER_PROFILE_KEY);
          if (cached) {
            const profile = JSON.parse(cached) as IUser;
            setCurrentUserId(profile.id);
            setUser(profile);
          }
          // Then try a fresh fetch — only clear tokens on 401, not network errors
          try {
            const me = await getMe();
            await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(me));
            console.log('[Auth] getMe success, userId:', me.id);
            setCurrentUserId(me.id);
            setUser(me);
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401) {
              await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
              await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
              await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
              setCurrentUserId('');
              setUser(null);
            }
            // Network error: cached profile stays, user remains logged in
          }
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
        await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
        await SecureStore.deleteItemAsync(USER_PROFILE_KEY);
        setCurrentUserId('');
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [logout, clearOfflineWall]);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await apiLogin(payload);
    await SecureStore.setItemAsync(TOKEN_KEYS.access, tokens.accessToken);
    await SecureStore.setItemAsync(TOKEN_KEYS.refresh, tokens.refreshToken);
    const me = await getMe();
    await SecureStore.setItemAsync(USER_PROFILE_KEY, JSON.stringify(me));
    setCurrentUserId(me.id);
    setUser(me);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await apiRegister(payload);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    requiresOnline,
    clearOfflineWall,
    login,
    register,
    logout
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
