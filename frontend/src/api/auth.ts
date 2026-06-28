import { api } from './client';
import type { AuthSession, AuthUser, LoginPayload, RegisterPayload } from '@/types/auth';

interface ApiResponse<T> {
  data: T;
  message: string;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const response = await api.post<ApiResponse<AuthUser>>('/api/auth/register', payload);
  return response.data.data;
}

export async function login(payload: LoginPayload): Promise<AuthSession> {
  const response = await api.post<ApiResponse<AuthSession>>('/api/auth/login', payload);
  return response.data.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<ApiResponse<AuthUser>>('/api/auth/me');
  return response.data.data;
}
