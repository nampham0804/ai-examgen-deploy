import { api } from './client';
import {
  mockApproveQuestion,
  mockGetQuestion,
  mockGetQuestions,
  mockRejectQuestion,
  mockUpdateQuestion,
} from '@/mocks/questions';
import type { Question, QuestionFilters, QuestionList, QuestionPayload } from '@/types/question';

interface ApiResponse<T> {
  data: T;
  message: string;
}

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export async function getQuestions(filters: QuestionFilters = {}): Promise<QuestionList> {
  if (useMock) {
    return mockGetQuestions(filters);
  }

  const response = await api.get<ApiResponse<QuestionList>>('/api/questions', { params: filters });
  return response.data.data;
}

export async function getQuestion(id: number): Promise<Question> {
  if (useMock) {
    return mockGetQuestion(id);
  }

  const response = await api.get<ApiResponse<Question>>(`/api/questions/${id}`);
  return response.data.data;
}

export async function updateQuestion(id: number, payload: QuestionPayload): Promise<Question> {
  if (useMock) {
    return mockUpdateQuestion(id, payload);
  }

  const response = await api.put<ApiResponse<Question>>(`/api/questions/${id}`, payload);
  return response.data.data;
}

export async function approveQuestion(id: number): Promise<Question> {
  if (useMock) {
    return mockApproveQuestion(id);
  }

  const response = await api.post<ApiResponse<Question>>(`/api/questions/${id}/approve`);
  return response.data.data;
}

export async function rejectQuestion(id: number): Promise<Question> {
  if (useMock) {
    return mockRejectQuestion(id);
  }

  const response = await api.post<ApiResponse<Question>>(`/api/questions/${id}/reject`);
  return response.data.data;
}
