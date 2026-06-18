import type { LearningOutcome, LearningOutcomePayload } from '@/types/learningOutcome';

let mockLearningOutcomes: LearningOutcome[] = [
  {
    id: 1,
    course_id: 1,
    code: 'LO1',
    description: 'Understand supervised and unsupervised learning fundamentals.',
    bloom_level: 'understand',
    created_at: '2026-06-17T08:00:00',
    updated_at: '2026-06-17T08:00:00',
  },
  {
    id: 2,
    course_id: 1,
    code: 'LO2',
    description: 'Apply model evaluation metrics to compare machine learning models.',
    bloom_level: 'apply',
    created_at: '2026-06-17T08:05:00',
    updated_at: '2026-06-17T08:05:00',
  },
  {
    id: 3,
    course_id: 1,
    code: 'LO3',
    description: 'Analyze model limitations and explain tradeoffs in selected algorithms.',
    bloom_level: 'analyze',
    created_at: '2026-06-17T08:10:00',
    updated_at: '2026-06-17T08:10:00',
  },
  {
    id: 4,
    course_id: 2,
    code: 'LO1',
    description: 'Implement linear data structures and reason about their operations.',
    bloom_level: 'apply',
    created_at: '2026-06-17T08:15:00',
    updated_at: '2026-06-17T08:15:00',
  },
];

const now = () => new Date().toISOString();

export async function mockGetLearningOutcomes(courseId: number): Promise<LearningOutcome[]> {
  return mockLearningOutcomes.filter((item) => item.course_id === courseId);
}

export async function mockCreateLearningOutcome(
  courseId: number,
  payload: LearningOutcomePayload,
): Promise<LearningOutcome> {
  if (mockLearningOutcomes.some((item) => item.course_id === courseId && item.code === payload.code)) {
    throw new Error('Learning outcome code already exists in this course');
  }

  const learningOutcome: LearningOutcome = {
    id: Math.max(0, ...mockLearningOutcomes.map((item) => item.id)) + 1,
    course_id: courseId,
    code: payload.code,
    description: payload.description,
    bloom_level: payload.bloom_level || null,
    created_at: now(),
    updated_at: now(),
  };
  mockLearningOutcomes = [...mockLearningOutcomes, learningOutcome];
  return learningOutcome;
}

export async function mockUpdateLearningOutcome(
  id: number,
  payload: LearningOutcomePayload,
): Promise<LearningOutcome> {
  const learningOutcome = mockLearningOutcomes.find((item) => item.id === id);
  if (!learningOutcome) {
    throw new Error('Learning outcome not found');
  }

  if (
    mockLearningOutcomes.some(
      (item) => item.course_id === learningOutcome.course_id && item.code === payload.code && item.id !== id,
    )
  ) {
    throw new Error('Learning outcome code already exists in this course');
  }

  const updated = {
    ...learningOutcome,
    code: payload.code,
    description: payload.description,
    bloom_level: payload.bloom_level || null,
    updated_at: now(),
  };
  mockLearningOutcomes = mockLearningOutcomes.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function mockDeleteLearningOutcome(id: number): Promise<void> {
  const learningOutcome = mockLearningOutcomes.find((item) => item.id === id);
  if (!learningOutcome) {
    throw new Error('Learning outcome not found');
  }
  mockLearningOutcomes = mockLearningOutcomes.filter((item) => item.id !== id);
}
