import type { Question, QuestionFilters, QuestionList, QuestionPayload } from '@/types/question';

let mockQuestions: Question[] = [
  {
    id: 101,
    course_id: 1,
    learning_outcome_id: 1,
    document_id: null,
    question_type: 'mcq',
    question_text: 'Which algorithm is commonly used for supervised learning?',
    difficulty: 'medium',
    options: [
      { key: 'A', text: 'K-Means' },
      { key: 'B', text: 'Linear Regression' },
      { key: 'C', text: 'DBSCAN' },
      { key: 'D', text: 'PCA' },
    ],
    correct_answer: 'B',
    suggested_answer: null,
    grading_rubric: null,
    explanation: 'Linear Regression learns from labeled input-output examples.',
    status: 'pending_review',
    created_by_ai: true,
    created_by: 1,
    approved_by: null,
    approved_at: null,
    created_at: '2026-06-18T08:00:00',
    updated_at: '2026-06-18T08:00:00',
  },
  {
    id: 102,
    course_id: 1,
    learning_outcome_id: 2,
    document_id: null,
    question_type: 'essay',
    question_text: 'Explain the difference between supervised and unsupervised learning.',
    difficulty: 'medium',
    options: null,
    correct_answer: null,
    suggested_answer:
      'Supervised learning uses labeled data to learn a mapping from input to output, while unsupervised learning discovers structure in unlabeled data.',
    grading_rubric:
      'Mention labeled versus unlabeled data, describe the learning goal of each approach, and provide one example algorithm for each.',
    explanation: 'This checks conceptual understanding of two core machine learning paradigms.',
    status: 'pending_review',
    created_by_ai: true,
    created_by: 1,
    approved_by: null,
    approved_at: null,
    created_at: '2026-06-18T08:05:00',
    updated_at: '2026-06-18T08:05:00',
  },
  {
    id: 103,
    course_id: 1,
    learning_outcome_id: 1,
    document_id: null,
    question_type: 'mcq',
    question_text: 'What does overfitting usually indicate?',
    difficulty: 'easy',
    options: [
      { key: 'A', text: 'The model generalizes well' },
      { key: 'B', text: 'The model memorizes training data too closely' },
      { key: 'C', text: 'The model has no parameters' },
      { key: 'D', text: 'The dataset has no labels' },
    ],
    correct_answer: 'B',
    suggested_answer: null,
    grading_rubric: null,
    explanation: 'Overfitting means the model performs well on training data but poorly on unseen data.',
    status: 'approved',
    created_by_ai: true,
    created_by: 1,
    approved_by: 1,
    approved_at: '2026-06-18T09:00:00',
    created_at: '2026-06-18T07:30:00',
    updated_at: '2026-06-18T09:00:00',
  },
];

function filterQuestions(filters: QuestionFilters): Question[] {
  return mockQuestions.filter((question) => {
    return (
      (!filters.status || question.status === filters.status) &&
      (!filters.course_id || question.course_id === filters.course_id) &&
      (!filters.learning_outcome_id || question.learning_outcome_id === filters.learning_outcome_id) &&
      (!filters.question_type || question.question_type === filters.question_type) &&
      (!filters.difficulty || question.difficulty === filters.difficulty)
    );
  });
}

export async function mockGetQuestions(filters: QuestionFilters = {}): Promise<QuestionList> {
  const page = filters.page || 1;
  const pageSize = filters.page_size || 20;
  const filtered = filterQuestions(filters);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    page_size: pageSize,
  };
}

export async function mockGetQuestion(id: number): Promise<Question> {
  const question = mockQuestions.find((item) => item.id === id);
  if (!question) {
    throw new Error('Question not found');
  }
  return question;
}

export async function mockUpdateQuestion(id: number, payload: QuestionPayload): Promise<Question> {
  const question = await mockGetQuestion(id);
  const updated: Question = {
    ...question,
    ...payload,
    updated_at: new Date().toISOString(),
  };
  mockQuestions = mockQuestions.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function mockApproveQuestion(id: number): Promise<Question> {
  const question = await mockGetQuestion(id);
  const updated: Question = {
    ...question,
    status: 'approved',
    approved_by: 1,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mockQuestions = mockQuestions.map((item) => (item.id === id ? updated : item));
  return updated;
}

export async function mockRejectQuestion(id: number): Promise<Question> {
  const question = await mockGetQuestion(id);
  const updated: Question = {
    ...question,
    status: 'rejected',
    approved_by: null,
    approved_at: null,
    updated_at: new Date().toISOString(),
  };
  mockQuestions = mockQuestions.map((item) => (item.id === id ? updated : item));
  return updated;
}
