import { BlueprintCreatePayload, BlueprintResponse, BlueprintListResponse } from '../types/exam';
import { MOCK_BLUEPRINT } from '../mocks/exam';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const blueprintApi = {
  async getBlueprints(courseId: number): Promise<BlueprintListResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => resolve({
        data: [MOCK_BLUEPRINT],
        message: "Mock blueprints retrieved successfully"
      }), 500));
    }
    const response = await fetch(`${API_BASE_URL}/blueprints?course_id=${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch blueprints');
    return response.json();
  },

  async getBlueprint(id: number): Promise<BlueprintResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => resolve({
        data: MOCK_BLUEPRINT,
        message: "Mock blueprint retrieved successfully"
      }), 500));
    }
    const response = await fetch(`${API_BASE_URL}/blueprints/${id}`);
    if (!response.ok) throw new Error('Failed to fetch blueprint');
    return response.json();
  },

  async createBlueprint(payload: BlueprintCreatePayload): Promise<BlueprintResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => resolve({
        data: {
          ...MOCK_BLUEPRINT,
          id: Math.floor(Math.random() * 1000),
          title: payload.title,
          course_id: payload.course_id,
          total_questions: payload.items.reduce((sum, item) => sum + item.easy_count + item.medium_count + item.hard_count, 0),
          items: payload.items.map((item, index) => ({
            ...item,
            id: index + 1,
            blueprint_id: 1,
          }))
        },
        message: "Mock blueprint created successfully"
      }), 800));
    }
    const response = await fetch(`${API_BASE_URL}/blueprints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create blueprint');
    return response.json();
  }
};
