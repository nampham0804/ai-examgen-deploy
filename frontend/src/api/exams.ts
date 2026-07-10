import { Exam, ExamCreatePayload, ExamResponse, ExamListResponse, ExamPreviewResponse, ExamPreviewQuestion } from '../types/exam';
import { MOCK_EXAM_PREVIEW, MOCK_EXAMS } from '../mocks/exam';
import { blueprintApi } from './blueprints';
import { api } from './client';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

let mockExams: Exam[] = [...MOCK_EXAMS];

export const examApi = {
  async getExams(courseId: number): Promise<ExamListResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const filtered = mockExams.filter(e => e.course_id === courseId);
        resolve({
          data: filtered,
          message: "Mock exams retrieved successfully"
        });
      }, 500));
    }
    const response = await api.get<ExamListResponse>(`/api/exams?course_id=${courseId}`);
    return response.data;
  },

  async getExam(id: number): Promise<ExamResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const found = mockExams.find(e => e.id === id);
        if (found) {
          resolve({ data: found, message: "Mock exam retrieved successfully" });
        } else {
          reject(new Error("Exam not found"));
        }
      }, 500));
    }
    const response = await api.get<ExamResponse>(`/api/exams/${id}`);
    return response.data;
  },

  async createExam(payload: ExamCreatePayload): Promise<ExamResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const newExam: Exam = {
          id: Math.floor(Math.random() * 10000),
          course_id: payload.course_id,
          blueprint_id: payload.blueprint_id,
          title: payload.title,
          duration_minutes: payload.duration_minutes,
          total_questions: 0,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          questions: []
        };
        mockExams.push(newExam);
        resolve({
          data: newExam,
          message: "Mock exam created successfully"
        });
      }, 800));
    }
    const response = await api.post<ExamResponse>('/api/exams', payload);
    return response.data;
  },

  async updateExam(id: number, payload: { title?: string; duration_minutes?: number; status?: string }): Promise<ExamResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const index = mockExams.findIndex(e => e.id === id);
        if (index === -1) return reject(new Error("Exam not found"));
        if (payload.title) mockExams[index].title = payload.title;
        if (payload.duration_minutes !== undefined) mockExams[index].duration_minutes = payload.duration_minutes;
        if (payload.status) mockExams[index].status = payload.status as any;
        resolve({ data: mockExams[index], message: "Mock exam updated successfully" });
      }, 500));
    }
    const response = await api.put<ExamResponse>(`/api/exams/${id}`, payload);
    return response.data;
  },

  async generateExam(id: number): Promise<ExamResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(async () => {
        const index = mockExams.findIndex(e => e.id === id);
        if (index === -1) return reject(new Error("Exam not found"));
        
        const exam = mockExams[index];
        // Mock generation: get blueprint to know how many questions
        try {
          const bpRes = await blueprintApi.getBlueprint(exam.blueprint_id);
          exam.total_questions = bpRes.data.total_questions;
        } catch (e) {
          exam.total_questions = 6; // fallback
        }

        exam.status = 'generated';
        exam.questions = Array.from({ length: exam.total_questions }).map((_, i) => ({
            id: Math.floor(Math.random() * 10000),
            exam_id: exam.id,
            question_id: Math.floor(Math.random() * 1000) + 1,
            order_index: i
        }));
        
        resolve({
          data: exam,
          message: "Mock exam generated successfully"
        });
      }, 1000));
    }
    const response = await api.post<ExamResponse>(`/api/exams/${id}/generate`);
    return response.data;
  },

  async getExamPreview(id: number): Promise<ExamPreviewResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        // Find if this is the predefined mock exam, else return a generic one
        if (id === MOCK_EXAM_PREVIEW.id) {
          return resolve({
            data: MOCK_EXAM_PREVIEW,
            message: "Mock exam preview loaded"
          });
        }
        
        const exam = mockExams.find(e => e.id === id);
        if (!exam) return reject(new Error("Exam not found"));

        // Generate dynamic questions based on total_questions
        const questionPool = [...MOCK_EXAM_PREVIEW.questions];
        const total = exam.total_questions || 6;
        
        // Shuffle pool
        const shuffledPool = questionPool.sort(() => Math.random() - 0.5);
        
        const questions: ExamPreviewQuestion[] = Array.from({ length: total }).map((_, i) => {
          const baseQ = shuffledPool[i % shuffledPool.length];
          return {
            ...baseQ,
            id: baseQ.id + i * 1000,
            exam_id: exam.id,
            question_id: baseQ.question_id,
            order_index: i + 1,
            text: `[Câu ${i + 1}] ` + baseQ.text
          };
        });

        resolve({
          data: {
            id: exam.id,
            title: exam.title,
            course_name: MOCK_EXAM_PREVIEW.course_name,
            duration_minutes: exam.duration_minutes,
            total_questions: total,
            status: exam.status,
            questions: questions
          },
          message: "Mock exam preview loaded"
        });
      }, 500));
    }
    
    const response = await api.get<ExamPreviewResponse>(`/api/exams/${id}/preview`);
    return response.data;
  },

  async swapQuestion(examId: number, questionId: number): Promise<{ data: { new_question_id: number; new_question: ExamPreviewQuestion }, message: string }> {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(() => {
        const pool = MOCK_EXAM_PREVIEW.questions;
        const randomQ = pool[Math.floor(Math.random() * pool.length)];
        const newId = Math.floor(Math.random() * 10000);
        
        resolve({
          data: {
            new_question_id: newId,
            new_question: {
              ...randomQ,
              id: newId,
              exam_id: examId,
              question_id: randomQ.question_id,
              order_index: 0,
              text: "[Đã đổi] " + randomQ.text
            }
          },
          message: "Question swapped successfully"
        });
      }, 600));
    }
    
    const response = await api.put<{ data: { new_question_id: number; new_question: ExamPreviewQuestion }, message: string }>(`/api/exams/${examId}/questions/${questionId}/swap`);
    return response.data;
  },

  async exportExam(id: number, format: string = 'gift'): Promise<Blob> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve(new Blob(['Mock file content'], { type: 'text/plain' }));
      }, 800));
    }
    const response = await api.get<Blob>(`/api/exports/${format}?exam_id=${id}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  async getAllExams(): Promise<ExamListResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve({
          data: mockExams,
          message: "All mock exams retrieved"
        });
      }, 500));
    }
    const response = await api.get<ExamListResponse>('/api/exams');
    return response.data;
  },

  async deleteExam(id: number): Promise<{ message: string }> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const index = mockExams.findIndex(e => e.id === id);
        if (index === -1) return reject(new Error("Exam not found"));
        mockExams.splice(index, 1);
        resolve({ message: "Mock exam deleted successfully" });
      }, 500));
    }
    const response = await api.delete<{ message: string }>(`/api/exams/${id}`);
    return response.data;
  },

  async reorderExam(id: number, items: { id: number, order_index: number }[]): Promise<any> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve({ message: "Mock exam reordered successfully" });
      }, 500));
    }
    const response = await api.put<any>(`/api/exams/${id}/reorder`, { items });
    return response.data;
  }
};

