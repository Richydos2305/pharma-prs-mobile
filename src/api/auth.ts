import { apiClient } from './client';
import type { AuthTokens, LoginPayload, RegisterPayload } from '../types';

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const { data } = await apiClient.post<{ data: AuthTokens }>('/api/auth/login', payload);
  return data.data;
}

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ data: { message: string } }>('/api/auth/register', payload);
  return data.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/api/auth/logout', { token: refreshToken });
}

export async function verifyEmail(payload: { token: string }): Promise<void> {
  await apiClient.post('/api/auth/verify-email', payload);
}

export async function resendVerification(payload: { email: string }): Promise<void> {
  await apiClient.post('/api/auth/resend-verification', payload);
}

export async function forgotPassword(payload: { email: string }): Promise<void> {
  await apiClient.post('/api/auth/forgot-password', payload);
}

export async function resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
  await apiClient.post('/api/auth/reset-password', payload);
}
