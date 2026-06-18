import { api } from './client';
import {
  mockCreateCourse,
  mockDeleteCourse,
  mockGetCourse,
  mockGetCourses,
  mockUpdateCourse,
} from '@/mocks/courses';
import type { Course, CoursePayload } from '@/types/course';
import type { LearningOutcome } from '@/types/learningOutcome';

interface ApiResponse<T> {
  data: T;
  message: string;
}

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export async function getCourses(): Promise<Course[]> {
  if (useMock) {
    return mockGetCourses();
  }

  const response = await api.get<ApiResponse<Course[]>>('/api/courses');
  return response.data.data;
}

export async function getCourse(id: number): Promise<Course> {
  if (useMock) {
    return mockGetCourse(id);
  }

  const response = await api.get<ApiResponse<Course>>(`/api/courses/${id}`);
  return response.data.data;
}

export async function createCourse(payload: CoursePayload): Promise<Course> {
  if (useMock) {
    return mockCreateCourse(payload);
  }

  const response = await api.post<ApiResponse<Course>>('/api/courses', payload);
  return response.data.data;
}

export async function updateCourse(id: number, payload: CoursePayload): Promise<Course> {
  if (useMock) {
    return mockUpdateCourse(id, payload);
  }

  const response = await api.put<ApiResponse<Course>>(`/api/courses/${id}`, payload);
  return response.data.data;
}

export async function deleteCourse(id: number): Promise<void> {
  if (useMock) {
    return mockDeleteCourse(id);
  }

  await api.delete<ApiResponse<{ id: number }>>(`/api/courses/${id}`);
}

export async function getCourseLearningOutcomes(id: number): Promise<LearningOutcome[]> {
  if (useMock) {
    return [];
  }

  const response = await api.get<ApiResponse<LearningOutcome[]>>(`/api/courses/${id}/learning-outcomes`);
  return response.data.data;
}
