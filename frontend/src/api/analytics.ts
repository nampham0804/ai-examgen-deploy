export interface RecentQuestion {
  id: number;
  text: string;
  course: string;
  lo: string;
  difficulty: string;
  status: string;
  created_at: string;
}

export interface RecentExam {
  id: number;
  title: string;
  course: string;
  total_questions: number;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  courses: number;
  questions_total: number;
  questions_pending: number;
  questions_approved: number;
  blueprints: number;
  exams: number;
  difficulty_distribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  type_distribution?: { name: string; value: number }[];
  recent_questions?: RecentQuestion[];
  recent_exams?: RecentExam[];
}

export interface DashboardResponse {
  data: DashboardStats;
  message: string;
}

import { api } from './client';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const analyticsApi = {
  async getDashboardStats(): Promise<DashboardResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        resolve({
          data: {
            courses: 24,
            questions_total: 790,
            questions_pending: 120,
            questions_approved: 670,
            blueprints: 43,
            exams: 15
          },
          message: "Dashboard loaded"
        });
      }, 500));
    }
    const response = await api.get<DashboardResponse>('/api/analytics/dashboard');
    return response.data;
  }
};

