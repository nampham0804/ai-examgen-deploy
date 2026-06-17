import { Blueprint } from '../types/exam';

export const MOCK_BLUEPRINT: Blueprint = {
  id: 1,
  course_id: 1,
  title: "Đề giữa kỳ - Demo",
  status: "draft",
  total_questions: 4,
  created_at: "2026-06-16T10:00:00Z",
  updated_at: "2026-06-16T10:00:00Z",
  items: [
    {
      id: 1,
      blueprint_id: 1,
      learning_outcome_id: 1,
      question_type: "mcq",
      easy_count: 1,
      medium_count: 1,
      hard_count: 0
    },
    {
      id: 2,
      blueprint_id: 1,
      learning_outcome_id: 1,
      question_type: "essay",
      easy_count: 0,
      medium_count: 1,
      hard_count: 0
    }
  ]
};
