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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_ROOT = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
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
    const response = await fetch(`${API_ROOT}/analytics/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  }
};
