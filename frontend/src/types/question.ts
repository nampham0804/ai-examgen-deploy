export type QuestionType = 'mcq' | 'essay';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'pending_review' | 'approved' | 'rejected';
export type QuestionOptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuestionOption {
  key: QuestionOptionKey;
  text: string;
}

export interface Question {
  id: number;
  course_id: number;
  learning_outcome_id: number;
  course_code?: string | null;
  course_name?: string | null;
  learning_outcome_code?: string | null;
  learning_outcome_description?: string | null;
  document_id?: number | null;
  question_type: QuestionType;
  question_text: string;
  difficulty: QuestionDifficulty;
  options?: QuestionOption[] | null;
  correct_answer?: QuestionOptionKey | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  explanation?: string | null;
  status: QuestionStatus;
  created_by_ai: boolean;
  created_by?: number | null;
  approved_by?: number | null;
  approved_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface QuestionPayload {
  question_type: QuestionType;
  question_text: string;
  difficulty: QuestionDifficulty;
  options?: QuestionOption[] | null;
  correct_answer?: QuestionOptionKey | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  explanation?: string | null;
}

export interface QuestionFilters {
  status?: QuestionStatus;
  course_id?: number;
  learning_outcome_id?: number;
  question_type?: QuestionType;
  difficulty?: QuestionDifficulty;
  page?: number;
  page_size?: number;
}

export interface QuestionList {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
}
