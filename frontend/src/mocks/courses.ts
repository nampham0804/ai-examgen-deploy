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
  {
    id: 3,
    code: 'CS301',
    name: 'Database Systems',
    description: 'Relational databases, SQL, and database design principles',
    owner_id: 1,
    created_at: '2026-06-17T08:10:00',
    updated_at: '2026-06-17T08:10:00',
  },
  {
    id: 4,
    code: 'CS501',
    name: 'Artificial Intelligence',
    description: 'Search algorithms, knowledge representation, and reasoning',
    owner_id: 1,
    created_at: '2026-06-17T08:15:00',
    updated_at: '2026-06-17T08:15:00',
  },
  {
    id: 5,
    code: 'CS101',
    name: 'Computer Networks',
    description: 'Network protocols, OSI model, and Internet architecture',
    owner_id: 1,
    created_at: '2026-06-17T08:20:00',
    updated_at: '2026-06-17T08:20:00',
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

import type { LearningOutcome } from '@/types/learningOutcome';

export const MOCK_LEARNING_OUTCOMES: LearningOutcome[] = [
  { id: 1, course_id: 1, code: 'LO1', description: 'Hiểu các khái niệm cơ bản về học máy', created_at: now(), updated_at: now() },
  { id: 2, course_id: 1, code: 'LO2', description: 'Phân loại các thuật toán học máy', created_at: now(), updated_at: now() },
  { id: 3, course_id: 1, code: 'LO3', description: 'Sử dụng Neural Networks cơ bản', created_at: now(), updated_at: now() },
  { id: 4, course_id: 1, code: 'LO4', description: 'Tối ưu hóa mô hình học máy', created_at: now(), updated_at: now() },
  { id: 5, course_id: 1, code: 'LO5', description: 'Đánh giá mô hình học máy', created_at: now(), updated_at: now() },
  
  // Course 2: Data Structures and Algorithms
  { id: 6, course_id: 2, code: 'CLO1', description: 'Phân tích độ phức tạp thuật toán (Big O)', created_at: now(), updated_at: now() },
  { id: 7, course_id: 2, code: 'CLO2', description: 'Sử dụng Array, Linked List, Stack, Queue', created_at: now(), updated_at: now() },
  { id: 8, course_id: 2, code: 'CLO3', description: 'Cài đặt các thuật toán sắp xếp, tìm kiếm', created_at: now(), updated_at: now() },
  
  // Course 3: Database Systems
  { id: 9, course_id: 3, code: 'CLO1', description: 'Thiết kế cơ sở dữ liệu quan hệ (ERD)', created_at: now(), updated_at: now() },
  { id: 10, course_id: 3, code: 'CLO2', description: 'Viết các câu truy vấn SQL phức tạp', created_at: now(), updated_at: now() },
  
  // Course 5: Computer Networks
  { id: 11, course_id: 5, code: 'CLO1', description: 'Giải thích mô hình OSI và TCP/IP', created_at: now(), updated_at: now() },
  { id: 12, course_id: 5, code: 'CLO2', description: 'Phân tích các giao thức mạng phổ biến (HTTP, TCP, UDP)', created_at: now(), updated_at: now() },
];

export async function mockGetCourseLearningOutcomes(id: number): Promise<LearningOutcome[]> {
  return MOCK_LEARNING_OUTCOMES.filter(lo => lo.course_id === id);
}
