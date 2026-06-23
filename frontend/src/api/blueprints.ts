import { BlueprintCreatePayload, BlueprintUpdatePayload, BlueprintResponse, BlueprintListResponse, Blueprint, ValidationResultResponse, ValidationDetail } from '../types/exam';
import { MOCK_BLUEPRINTS } from '../mocks/exam';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const API_ROOT = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// In-memory mock store for session persistence
let mockBlueprints: Blueprint[] = [...MOCK_BLUEPRINTS];

export const blueprintApi = {
  async getBlueprints(courseId: number): Promise<BlueprintListResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const filtered = mockBlueprints.filter(b => b.course_id === courseId);
        resolve({
          data: filtered,
          message: "Mock blueprints retrieved successfully"
        });
      }, 500));
    }
    const response = await fetch(`${API_ROOT}/blueprints?course_id=${courseId}`);
    if (!response.ok) throw new Error('Failed to fetch blueprints');
    return response.json();
  },

  async getBlueprint(id: number): Promise<BlueprintResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const found = mockBlueprints.find(b => b.id === id);
        if (found) {
          resolve({ data: found, message: "Mock blueprint retrieved successfully" });
        } else {
          reject(new Error("Blueprint not found"));
        }
      }, 500));
    }
    const response = await fetch(`${API_ROOT}/blueprints/${id}`);
    if (!response.ok) throw new Error('Failed to fetch blueprint');
    return response.json();
  },

  async createBlueprint(payload: BlueprintCreatePayload): Promise<BlueprintResponse> {
    if (USE_MOCK) {
      return new Promise(resolve => setTimeout(() => {
        const newBlueprint: Blueprint = {
          id: Math.floor(Math.random() * 10000),
          title: payload.title,
          course_id: payload.course_id,
          total_questions: payload.items.reduce((sum, item) => sum + item.easy_count + item.medium_count + item.hard_count, 0),
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: payload.items.map((item, index) => ({
            ...item,
            id: Math.floor(Math.random() * 10000) + index,
            blueprint_id: 1, // Will be set to real ID in DB
          }))
        };
        mockBlueprints.push(newBlueprint);
        resolve({
          data: newBlueprint,
          message: "Mock blueprint created successfully"
        });
      }, 800));
    }
    const response = await fetch(`${API_ROOT}/blueprints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to create blueprint');
    return response.json();
  },

  async updateBlueprint(id: number, payload: BlueprintUpdatePayload): Promise<BlueprintResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const index = mockBlueprints.findIndex(b => b.id === id);
        if (index === -1) return reject(new Error("Blueprint not found"));
        
        const existing = mockBlueprints[index];
        const updatedItems = payload.items ? payload.items.map((item, idx) => ({
            ...item,
            id: Math.floor(Math.random() * 10000) + idx,
            blueprint_id: existing.id,
        })) : existing.items;

        const updatedBlueprint: Blueprint = {
          ...existing,
          title: payload.title || existing.title,
          total_questions: payload.items 
            ? payload.items.reduce((sum, item) => sum + item.easy_count + item.medium_count + item.hard_count, 0)
            : existing.total_questions,
          items: updatedItems,
          updated_at: new Date().toISOString()
        };
        
        mockBlueprints[index] = updatedBlueprint;
        resolve({
          data: updatedBlueprint,
          message: "Mock blueprint updated successfully"
        });
      }, 800));
    }
    const response = await fetch(`${API_ROOT}/blueprints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Failed to update blueprint');
    return response.json();
  },

  async deleteBlueprint(id: number): Promise<{ message: string }> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const index = mockBlueprints.findIndex(b => b.id === id);
        if (index === -1) return reject(new Error("Blueprint not found"));
        mockBlueprints.splice(index, 1);
        resolve({ message: "Mock blueprint deleted successfully" });
      }, 500));
    }
    const response = await fetch(`${API_ROOT}/blueprints/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete blueprint');
    return response.json();
  },

  async validateBlueprint(id: number): Promise<ValidationResultResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const index = mockBlueprints.findIndex(b => b.id === id);
        if (index === -1) return reject(new Error("Blueprint not found"));
        const blueprint = mockBlueprints[index];
        
        const details: ValidationDetail[] = blueprint.items.map(item => ({
          learning_outcome_id: item.learning_outcome_id,
          learning_outcome_code: `LO${item.learning_outcome_id}`,
          question_type: item.question_type,
          easy_required: item.easy_count,
          easy_available: item.easy_count, // Mock: always have enough
          medium_required: item.medium_count,
          medium_available: item.medium_count,
          hard_required: item.hard_count,
          hard_available: item.hard_count,
          is_valid: true,
        }));

        blueprint.status = 'validated'; // Update status

        resolve({
          data: {
            is_valid: true,
            total_required: blueprint.total_questions,
            details
          },
          message: "Mock blueprint validation completed"
        });
      }, 500));
    }
    const response = await fetch(`${API_ROOT}/blueprints/${id}/validate`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to validate blueprint');
    return response.json();
  }
};
