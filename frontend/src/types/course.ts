export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  owner_id: number;
  created_at: string;
  updated_at?: string | null;
}

export interface CoursePayload {
  code: string;
  name: string;
  description?: string;
}
