import { BlueprintCreatePayload, BlueprintUpdatePayload, BlueprintResponse, BlueprintListResponse, Blueprint, ValidationResultResponse, ValidationDetail } from '../types/exam';
import { MOCK_BLUEPRINTS } from '../mocks/exam';
import { mockQuestions } from '../mocks/questions';
import { api } from './client';

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
    const response = await api.get<BlueprintListResponse>(`/api/blueprints?course_id=${courseId}`);
    return response.data;
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
    const response = await api.get<BlueprintResponse>(`/api/blueprints/${id}`);
    return response.data;
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
    const response = await api.post<BlueprintResponse>('/api/blueprints', payload);
    return response.data;
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
    const response = await api.put<BlueprintResponse>(`/api/blueprints/${id}`, payload);
    return response.data;
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
    const response = await api.delete<{ message: string }>(`/api/blueprints/${id}`);
    return response.data;
  },

  async validateBlueprint(id: number): Promise<ValidationResultResponse> {
    if (USE_MOCK) {
      return new Promise((resolve, reject) => setTimeout(() => {
        const index = mockBlueprints.findIndex(b => b.id === id);
        if (index === -1) return reject(new Error("Blueprint not found"));
        const blueprint = mockBlueprints[index];
        
        const details: ValidationDetail[] = blueprint.items.map(item => {
          const relevantQuestions = mockQuestions.filter(q => 
            q.learning_outcome_id === item.learning_outcome_id && 
            q.question_type === item.question_type
          );

          const availableEasy = relevantQuestions.filter(q => q.difficulty === 'easy').length;
          const availableMedium = relevantQuestions.filter(q => q.difficulty === 'medium').length;
          const availableHard = relevantQuestions.filter(q => q.difficulty === 'hard').length;

          const easyMissing = item.easy_count > availableEasy ? item.easy_count - availableEasy : 0;
          const mediumMissing = item.medium_count > availableMedium ? item.medium_count - availableMedium : 0;
          const hardMissing = item.hard_count > availableHard ? item.hard_count - availableHard : 0;
          
          const isValid = easyMissing === 0 && mediumMissing === 0 && hardMissing === 0;

          const missingMsg = [];
          if (easyMissing > 0) missingMsg.push(`Thiếu ${easyMissing} Easy`);
          if (mediumMissing > 0) missingMsg.push(`Thiếu ${mediumMissing} Medium`);
          if (hardMissing > 0) missingMsg.push(`Thiếu ${hardMissing} Hard`);

          return {
            learning_outcome_id: item.learning_outcome_id,
            learning_outcome_code: `LO${item.learning_outcome_id}`,
            question_type: item.question_type,
            easy_required: item.easy_count,
            easy_available: availableEasy,
            medium_required: item.medium_count,
            medium_available: availableMedium,
            hard_required: item.hard_count,
            hard_available: availableHard,
            is_valid: isValid,
            missing: isValid ? null : `${missingMsg.join(', ')} ${item.question_type} cho LO${item.learning_outcome_id}`,
          };
        });

        const allValid = details.every(d => d.is_valid);
        blueprint.status = allValid ? 'validated' : 'draft'; // Update status

        resolve({
          data: {
            is_valid: allValid,
            total_required: blueprint.total_questions,
            details
          },
          message: "Mock blueprint validation completed"
        });
      }, 500));
    }
    const response = await api.post<ValidationResultResponse>(`/api/blueprints/${id}/validate`);
    return response.data;
  },

  async checkEligibility(id: number): Promise<ValidationResultResponse> {
    if (USE_MOCK) {
      return this.validateBlueprint(id); // For mock, it's roughly the same
    }
    const response = await api.get<ValidationResultResponse>(`/api/blueprints/${id}/eligibility`);
    return response.data;
  }
};

