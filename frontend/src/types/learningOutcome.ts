export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface LearningOutcome {
  id: number;
  course_id: number;
  code: string;
  description: string;
  bloom_level?: BloomLevel | null;
  created_at: string;
  updated_at?: string | null;
}

export interface LearningOutcomePayload {
  code: string;
  description: string;
  bloom_level?: BloomLevel | '';
}
