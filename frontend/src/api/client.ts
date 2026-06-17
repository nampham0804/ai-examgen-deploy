import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown; error?: string } | undefined;
    if (typeof data?.detail === 'string') {
      return data.detail;
    }
    if (data?.detail && typeof data.detail === 'object') {
      const detail = data.detail as { detail?: string; error?: string };
      return detail.detail || detail.error || error.message;
    }
    return data?.error || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error';
}
