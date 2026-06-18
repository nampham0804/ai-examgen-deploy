import { api } from './client';
import {
  mockCreateLearningOutcome,
  mockDeleteLearningOutcome,
  mockGetLearningOutcomes,
  mockUpdateLearningOutcome,
} from '@/mocks/learningOutcomes';
import type { LearningOutcome, LearningOutcomePayload } from '@/types/learningOutcome';

interface ApiResponse<T> {
  data: T;
  message: string;
}

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export async function getLearningOutcomes(courseId: number): Promise<LearningOutcome[]> {
  if (useMock) {
    return mockGetLearningOutcomes(courseId);
  }

  const response = await api.get<ApiResponse<LearningOutcome[]>>(`/api/courses/${courseId}/learning-outcomes`);
  return response.data.data;
}

export async function createLearningOutcome(
  courseId: number,
  payload: LearningOutcomePayload,
): Promise<LearningOutcome> {
  if (useMock) {
    return mockCreateLearningOutcome(courseId, payload);
  }

  const response = await api.post<ApiResponse<LearningOutcome>>(
    `/api/courses/${courseId}/learning-outcomes`,
    payload,
  );
  return response.data.data;
}

export async function updateLearningOutcome(
  id: number,
  payload: LearningOutcomePayload,
): Promise<LearningOutcome> {
  if (useMock) {
    return mockUpdateLearningOutcome(id, payload);
  }

  const response = await api.put<ApiResponse<LearningOutcome>>(`/api/learning-outcomes/${id}`, payload);
  return response.data.data;
}

export async function deleteLearningOutcome(id: number): Promise<void> {
  if (useMock) {
    return mockDeleteLearningOutcome(id);
  }

  await api.delete<ApiResponse<{ id: number }>>(`/api/learning-outcomes/${id}`);
}
