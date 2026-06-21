import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout, register as apiRegister } from '../api/auth';
import { getMe } from '../api/users';
import { TOKEN_KEYS, setLogoutCallback } from '../api/client';
import type { IUser, LoginPayload, RegisterPayload } from '../types';

interface AuthContextValue {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
      if (refreshToken) {
        apiLogout(refreshToken);
      }
    } catch {
      // fire-and-forget; ignore logout API errors
    }
    await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
    await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
    setUser(null);
  }, []);

  useEffect(() => {
    setLogoutCallback(logout);

    async function bootstrap() {
      try {
        const accessToken = await SecureStore.getItemAsync(TOKEN_KEYS.access);
        const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
        if (accessToken && refreshToken) {
          const me = await getMe();
          setUser(me);
        }
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
        await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [logout]);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await apiLogin(payload);
    await SecureStore.setItemAsync(TOKEN_KEYS.access, tokens.accessToken);
    await SecureStore.setItemAsync(TOKEN_KEYS.refresh, tokens.refreshToken);
    const me = await getMe();
    setUser(me);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    await apiRegister(payload);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
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
