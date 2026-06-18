import { Exam, ExamCreatePayload, ExamResponse, ExamListResponse, ExamPreviewResponse, ExamPreviewQuestion } from '../types/exam';
import { MOCK_EXAM_PREVIEW, MOCK_EXAMS } from '../mocks/exam';
import { blueprintApi } from './blueprints';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
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
    const response = await fetch(`${API_BASE_URL}/exams?course_id=${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch exams');
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/exams/${id}`);
    if (!response.ok) throw new Error('Failed to fetch exam');
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create exam');
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/exams/${id}/generate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate exam');
    return response.json();
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
        const questionPool = MOCK_EXAM_PREVIEW.questions;
        const total = exam.total_questions || 6;
        const questions: ExamPreviewQuestion[] = Array.from({ length: total }).map((_, i) => {
          const baseQ = questionPool[i % questionPool.length];
          return {
            ...baseQ,
            id: baseQ.id + i * 1000,
            exam_id: exam.id,
            question_id: baseQ.question_id + i,
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
            questions: questions
          },
          message: "Mock exam preview loaded"
        });
      }, 500));
    }
    
    const response = await fetch(`${API_BASE_URL}/exams/${id}/preview`);
    if (!response.ok) throw new Error('Failed to fetch exam preview');
    return response.json();
  },

  async swapQuestion(examId: number, questionId: number): Promise<{ data: { new_question_id: number; new_question: ExamPreviewQuestion }, message: string }> {
    if (USE_MOCK) {
      return new Promise((resolve) => setTimeout(() => {
        const isMcq = Math.random() > 0.3;
        const qId = Math.floor(Math.random() * 1000) + 1;
        const diffs = ['easy', 'medium', 'hard'];
        
        const newQ: ExamPreviewQuestion = {
          id: qId + 20000,
          exam_id: examId,
          question_id: qId,
          order_index: 0, // Ignored in UI
          text: `[ĐÃ ĐỔI] Nội dung câu hỏi thay thế mới mã ${qId}`,
          type: isMcq ? 'Multiple Choice' : 'Essay',
          difficulty: diffs[Math.floor(Math.random() * diffs.length)],
          learning_outcome_code: `LO${Math.floor(Math.random() * 5) + 1}`,
          options: isMcq ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : undefined,
          correct_answer: isMcq ? 'Option 1' : undefined,
          sample_answer: !isMcq ? 'Đáp án mẫu mới...' : undefined,
          rubric: !isMcq ? 'Rubric mới' : undefined
        };
        
        resolve({
          data: { new_question_id: qId, new_question: newQ },
          message: "Swapped successfully"
        });
      }, 600));
    }
    
    // In a real app, the backend just returns the new question ID or the new question data
    const response = await fetch(`${API_BASE_URL}/exams/${examId}/questions/${questionId}/swap`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('Failed to swap question');
    const result = await response.json();
    
    // Re-fetch preview to get the full question object is an option, 
    // or let the backend return the new object. Since our backend only returns ID, we simulate a refetch.
    return result; // We will adapt frontend to refetch if needed
  },

  async exportToGift(id: number): Promise<Blob> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const exam = mockExams.find(e => e.id === id);
        if (!exam && id !== MOCK_EXAM_PREVIEW.id) return reject(new Error("Exam not found"));

        // For mock, just generate from MOCK_EXAM_PREVIEW or the exam's questions
        const questions = id === MOCK_EXAM_PREVIEW.id ? MOCK_EXAM_PREVIEW.questions : exam?.questions || MOCK_EXAM_PREVIEW.questions;
        
        let giftContent = `// Exam ${exam?.title || MOCK_EXAM_PREVIEW.title}\n\n`;

        // Format each question to GIFT
        // MOCK_EXAM_PREVIEW.questions has the full question objects
        const fullQuestions = MOCK_EXAM_PREVIEW.questions; 

        fullQuestions.forEach((q, index) => {
          const safeText = q.text.replace(/([{}~=#\:])/g, "\\$1");
          if (q.type === 'Multiple Choice' && q.options) {
            giftContent += `::Q${index + 1}::${safeText} {\n`;
            q.options.forEach(opt => {
              const safeOpt = opt.replace(/([{}~=#\:])/g, "\\$1");
              if (opt === q.correct_answer) {
                giftContent += `=${safeOpt}\n`;
              } else {
                giftContent += `~${safeOpt}\n`;
              }
            });
            giftContent += `}\n\n`;
          } else if (q.type === 'Essay') {
            giftContent += `::Q${index + 1}::${safeText} {}\n\n`;
          }
        });

        const blob = new Blob([giftContent], { type: 'text/plain;charset=utf-8' });
        resolve(blob);
      }, 800));
    }
    
    const response = await fetch(`${API_BASE_URL}/exports/gift?exam_id=${id}`);
    if (!response.ok) throw new Error('Failed to export to GIFT');
    return response.blob();
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
    const response = await fetch(`${API_BASE_URL}/exams`);
    if (!response.ok) throw new Error('Failed to fetch all exams');
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/exams/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete exam');
    return response.json();
  }
};
