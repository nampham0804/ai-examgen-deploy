const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const API_ROOT = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

type ApiEnvelope<T> = {
  data: T;
  message: string;
};

type ApiError = {
  error?: string;
  detail?: string;
};

export type Course = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
};

export type LearningOutcome = {
  id: number;
  course_id: number;
  code: string;
  description: string;
  bloom_level?: string | null;
};

export type DocumentUpload = {
  id: number;
  course_id: number;
  file_name: string;
  file_type: string;
  document_type: string;
  file_size_bytes: number;
  page_count?: number | null;
  status: string;
};

export type DocumentExtract = {
  id: number;
  status: string;
  text_length: number;
  chunk_count: number;
  extraction_method: string;
};

export type ExistingDocument = {
  id: number;
  course_id: number;
  file_name: string;
  document_type: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  page_count?: number | null;
  text_length?: number | null;
  chunk_count: number;
  created_at: string;
};

export type DocumentListResponse = {
  items: ExistingDocument[];
  total: number;
  limit: number;
  offset: number;
};

export type DocumentChunk = {
  id: number;
  document_id: number;
  course_id: number;
  chunk_index: number;
  title?: string | null;
  section_path?: string | null;
  text: string;
  keywords?: string[] | null;
  token_count?: number | null;
  page_start?: number | null;
  page_end?: number | null;
  created_at: string;
};

export type QuestionOption = {
  label?: string;
  key?: string;
  text: string;
};

export type GeneratedQuestion = {
  id: number;
  course_id: number;
  learning_outcome_id: number;
  document_id?: number | null;
  question_type: 'mcq' | 'essay';
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options?: QuestionOption[] | null;
  correct_answer?: string | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  explanation?: string | null;
  status: 'pending_review' | 'approved' | 'rejected';
  created_by_ai: boolean;
  source_chunk_ids?: number[] | null;
  generation_topic?: string | null;
  created_at: string;
};

export type GenerateQuestionsRequest = {
  document_id?: number;
  document_ids?: number[];
  learning_outcome_id: number;
  question_type: 'mcq' | 'essay';
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  topic?: string | null;
  top_k: number;
  diversity_mode: boolean;
};

export type GenerateQuestionsResponse = {
  generated: number;
  document_id?: number | null;
  document_ids?: number[] | null;
  learning_outcome_id: number;
  source_chunk_ids: number[];
  warnings: string[];
  questions: GeneratedQuestion[];
};

export type QuestionListResponse = {
  items: GeneratedQuestion[];
  total: number;
  limit: number;
  offset: number;
};

export async function listCourses(): Promise<Course[]> {
  return requestJson<Course[]>('/courses');
}

export async function listLearningOutcomes(courseId: number): Promise<LearningOutcome[]> {
  return requestJson<LearningOutcome[]>(`/courses/${courseId}/learning-outcomes`);
}

export async function uploadDocument(file: File, courseId: number, documentType = 'lecture'): Promise<DocumentUpload> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('course_id', String(courseId));
  formData.append('document_type', documentType);
  return requestJson<DocumentUpload>('/documents/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function extractDocument(documentId: number): Promise<DocumentExtract> {
  return requestJson<DocumentExtract>(`/documents/${documentId}/extract`, {
    method: 'POST',
  });
}

export async function listDocuments(params: {
  course_id: number;
  status?: string;
  document_type?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentListResponse> {
  const query = new URLSearchParams();
  query.set('course_id', String(params.course_id));
  if (params.status) query.set('status', params.status);
  if (params.document_type) query.set('document_type', params.document_type);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  return requestJson<DocumentListResponse>(`/documents?${query.toString()}`);
}

export async function listDocumentChunks(documentId: number): Promise<DocumentChunk[]> {
  return requestJson<DocumentChunk[]>(`/documents/${documentId}/chunks`);
}

export async function generateQuestions(payload: GenerateQuestionsRequest): Promise<GenerateQuestionsResponse> {
  return requestJson<GenerateQuestionsResponse>('/ai/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function listQuestions(params: {
  document_id: number;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<QuestionListResponse> {
  const query = new URLSearchParams();
  query.set('document_id', String(params.document_id));
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  return requestJson<QuestionListResponse>(`/questions?${query.toString()}`);
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers = {
    ...(init?.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiError | null;
  if (!response.ok) {
    const apiError = payload as ApiError | null;
    throw new Error(apiError?.detail || apiError?.error || `Request failed with status ${response.status}`);
  }
  return (payload as ApiEnvelope<T>).data;
}
