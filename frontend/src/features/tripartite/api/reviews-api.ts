import apiClient from '../../../shared/lib/api-client';
import { mockApi } from '../../../shared/lib/mock-api';
import {
  TripartiteReview,
  ReviewListParams,
  ReviewListResponse,
  AnalyticsSummary,
  CriteriaPassRate,
  TrendData,
  CoachAnalytics,
} from '../../../shared/types/review';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export const reviewsApi = {
  getReviews: async (params: ReviewListParams): Promise<ReviewListResponse> => {
    if (useMock) return mockApi.getReviews(params);
    const response = await apiClient.get('/reviews', { params });
    return response.data;
  },

  getReview: async (id: string): Promise<TripartiteReview> => {
    if (useMock) return mockApi.getReview(id);
    const response = await apiClient.get(`/reviews/${id}`);
    return response.data;
  },

  createReview: async (data: Partial<TripartiteReview>): Promise<TripartiteReview> => {
    if (useMock) return mockApi.createReview(data);
    const response = await apiClient.post('/reviews', data);
    return response.data;
  },

  updateReview: async (id: string, data: Partial<TripartiteReview>): Promise<TripartiteReview> => {
    if (useMock) return mockApi.updateReview(id, data);
    const response = await apiClient.patch(`/reviews/${id}`, data);
    return response.data;
  },

  updateEvaluations: async (id: string, evaluations: any[]): Promise<void> => {
    if (useMock) return mockApi.updateEvaluations(id, evaluations);
    await apiClient.put(`/reviews/${id}/evaluations`, { evaluations });
  },

  getActions: async (id: string): Promise<any[]> => {
    if (useMock) return mockApi.getActions(id);
    const response = await apiClient.get(`/reviews/${id}/actions`);
    return response.data;
  },

  createAction: async (id: string, action: any): Promise<any> => {
    if (useMock) return mockApi.createAction(id, action);
    const response = await apiClient.post(`/reviews/${id}/actions`, action);
    return response.data;
  },

  updateAction: async (actionId: string, data: any): Promise<any> => {
    if (useMock) return mockApi.updateAction(actionId, data);
    const response = await apiClient.patch(`/actions/${actionId}`, data);
    return response.data;
  },

  deleteAction: async (actionId: string): Promise<void> => {
    if (useMock) return mockApi.deleteAction(actionId);
    await apiClient.delete(`/actions/${actionId}`);
  },

  signOff: async (id: string, data: any): Promise<void> => {
    if (useMock) return mockApi.signOff(id, data);
    await apiClient.post(`/reviews/${id}/signoff`, data);
  },

  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    if (useMock) return mockApi.getAnalyticsSummary();
    const response = await apiClient.get('/analytics/summary');
    return response.data;
  },

  getCriteriaPassRate: async (): Promise<CriteriaPassRate[]> => {
    if (useMock) return mockApi.getCriteriaPassRate();
    const response = await apiClient.get('/analytics/criteria-pass-rate');
    return response.data;
  },

  getTrend: async (params: any): Promise<TrendData[]> => {
    if (useMock) return mockApi.getTrend(params);
    const response = await apiClient.get('/analytics/trend', { params });
    return response.data;
  },

  getCoachAnalytics: async (): Promise<CoachAnalytics[]> => {
    if (useMock) return mockApi.getCoachAnalytics();
    const response = await apiClient.get('/analytics/by-coach');
    return response.data;
  },
};

// Named convenience exports for direct imports
export const createReview = (data: Partial<TripartiteReview>): Promise<TripartiteReview> =>
  reviewsApi.createReview(data);