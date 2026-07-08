export interface BlueprintItem {
  id: number;
  blueprint_id: number;
  learning_outcome_id: number;
  question_type: 'mcq' | 'essay';
  easy_count: number;
  medium_count: number;
  hard_count: number;
}

export interface Blueprint {
  id: number;
  course_id: number;
  title: string;
  total_questions: number;
  status: 'draft' | 'validated';
  created_by?: number;
  created_at: string;
  updated_at: string;
  items: BlueprintItem[];
}

export interface BlueprintItemCreate {
  learning_outcome_id: number;
  question_type: 'mcq' | 'essay';
  easy_count: number;
  medium_count: number;
  hard_count: number;
}

export interface BlueprintCreatePayload {
  course_id: number;
  title: string;
  items: BlueprintItemCreate[];
}

export interface BlueprintUpdatePayload {
  title?: string;
  items?: BlueprintItemCreate[]; // Using Create payload format since items are usually overwritten or synced
}

export interface BlueprintResponse {
  data: Blueprint;
  message: string;
}

export interface BlueprintListResponse {
  data: Blueprint[];
  message: string;
}

export interface ValidationDetail {
  learning_outcome_id: number;
  learning_outcome_code: string;
  question_type: 'mcq' | 'essay';
  easy_required: number;
  easy_available: number;
  medium_required: number;
  medium_available: number;
  hard_required: number;
  hard_available: number;
  is_valid: boolean;
  missing?: string;
}

export interface ValidationResultData {
  is_valid: boolean;
  total_required: number;
  details: ValidationDetail[];
}

export interface ValidationResultResponse {
  data: ValidationResultData;
  message: string;
}

// ======= Exam Types =======

export interface ExamQuestion {
  id: number;
  exam_id: number;
  question_id: number;
  order_index: number;
}

export interface Exam {
  id: number;
  course_id: number;
  blueprint_id: number | null;
  title: string;
  duration_minutes: number;
  total_questions: number;
  status: 'draft' | 'approved';
  created_at: string;
  updated_at: string;
  course_name?: string | null;
  blueprint_name?: string | null;
  questions: ExamQuestion[];
}

export interface ExamCreatePayload {
  course_id: number;
  blueprint_id: number;
  title: string;
  duration_minutes: number;
}

export interface ExamResponse {
  data: Exam;
  message: string;
}

export interface ExamListResponse {
  data: Exam[];
  message: string;
}

export interface ExamPreviewQuestion {
  id: number;
  exam_id: number;
  question_id: number | null;
  order_index: number;
  type: 'Multiple Choice' | 'Essay';
  text: string;
  options?: string[];
  correct_answer?: string;
  sample_answer?: string;
  rubric?: string;
  explanation?: string;
  difficulty: string;
  learning_outcome_code: string;
  points?: number;
}

export interface ExamPreviewData {
  id: number;
  course_name: string;
  title: string;
  duration_minutes: number;
  total_questions: number;
  status: string;
  questions: ExamPreviewQuestion[];
}

export interface ExamPreviewResponse {
  data: ExamPreviewData;
  message: string;
}
