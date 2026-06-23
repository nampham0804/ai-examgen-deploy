import type { Course, CoursePayload } from '@/types/course';

let mockCourses: Course[] = [
  {
    id: 1,
    code: 'CS401',
    name: 'Machine Learning',
    description: 'Introductory machine learning course',
    owner_id: 1,
    created_at: '2026-06-17T08:00:00',
    updated_at: '2026-06-17T08:00:00',
  },
  {
    id: 2,
    code: 'CS201',
    name: 'Data Structures and Algorithms',
    description: 'Core data structures, algorithm analysis, and implementation patterns',
    owner_id: 1,
    created_at: '2026-06-17T08:05:00',
    updated_at: '2026-06-17T08:05:00',
  },
];

export const MOCK_COURSES = mockCourses;

const now = () => new Date().toISOString();

export async function mockGetCourses(): Promise<Course[]> {
  return [...mockCourses];
}

export async function mockGetCourse(id: number): Promise<Course> {
  const course = mockCourses.find((item) => item.id === id);
  if (!course) {
    throw new Error('Course not found');
  }
  return course;
}

export async function mockCreateCourse(payload: CoursePayload): Promise<Course> {
  if (mockCourses.some((course) => course.code === payload.code)) {
    throw new Error('Course code already exists');
  }

  const course: Course = {
    id: Math.max(0, ...mockCourses.map((item) => item.id)) + 1,
    code: payload.code,
    name: payload.name,
    description: payload.description || null,
    owner_id: 1,
    created_at: now(),
    updated_at: now(),
  };
  mockCourses = [course, ...mockCourses];
  return course;
}

export async function mockUpdateCourse(id: number, payload: CoursePayload): Promise<Course> {
  const course = await mockGetCourse(id);
  if (mockCourses.some((item) => item.code === payload.code && item.id !== id)) {
    throw new Error('Course code already exists');
  }

  const updated = {
    ...course,
    code: payload.code,
    name: payload.name,
    description: payload.description || null,
    updated_at: now(),
  };
  mockCourses = mockCourses.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function mockDeleteCourse(id: number): Promise<void> {
  await mockGetCourse(id);
  mockCourses = mockCourses.filter((item) => item.id !== id);
}
