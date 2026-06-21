import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export const apiClient = axios.create({ baseURL: BASE_URL });

export const TOKEN_KEYS = { access: 'accessToken', refresh: 'refreshToken' } as const;

let refreshPromise: Promise<string> | null = null;
let onLogout: (() => void) | null = null;

export function setLogoutCallback(fn: () => void): void {
  onLogout = fn;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEYS.access);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = await SecureStore.getItemAsync(TOKEN_KEYS.refresh);
      if (refreshToken) {
        try {
          if (!refreshPromise) {
            refreshPromise = axios
              .post(`${BASE_URL}/api/auth/refresh`, { token: refreshToken })
              .then(async ({ data }: { data: { data: { accessToken: string; refreshToken: string } } }) => {
                const newAccess = data.data.accessToken;
                await SecureStore.setItemAsync(TOKEN_KEYS.access, newAccess);
                await SecureStore.setItemAsync(TOKEN_KEYS.refresh, data.data.refreshToken);
                return newAccess;
              })
              .finally(() => {
                refreshPromise = null;
              });
          }
          const newAccessToken = await refreshPromise;
          original.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(original);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEYS.access);
          await SecureStore.deleteItemAsync(TOKEN_KEYS.refresh);
          if (onLogout) onLogout();
        }
      }
    }
    return Promise.reject(error);
  }
);
