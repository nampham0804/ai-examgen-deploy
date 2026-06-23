export interface DashboardStats {
  courses: number;
  questions_total: number;
  questions_pending: number;
  questions_approved: number;
  blueprints: number;
  exams: number;
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
