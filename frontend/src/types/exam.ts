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
  status: 'draft' | 'validated' | 'active';
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
