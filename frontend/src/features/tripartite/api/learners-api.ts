import apiClient from '../../../shared/lib/api-client';
import { LearnerWithStatus } from '../../../shared/types/learner';
import { TripartiteReviewSummary } from '../../../shared/types/review';
import {
  mockGetLearners,
  mockGetLearner,
  mockGetLearnerReviews,
} from '../../../shared/lib/mock-learner-api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export interface GetLearnersParams {
  search?: string;
  status?: string;
  coach_id?: string;
  programme?: string;
  group?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export interface GetLearnersResponse {
  items: LearnerWithStatus[];
  total: number;
}

export async function getLearners(params: GetLearnersParams): Promise<GetLearnersResponse> {
  if (USE_MOCK) {
    return mockGetLearners(params);
  }
  const response = await apiClient.get<GetLearnersResponse>('/api/v1/learners', { params });
  return response.data;
}

export async function getLearnerById(learnerId: string): Promise<LearnerWithStatus> {
  if (USE_MOCK) {
    const learner = await mockGetLearner(learnerId);
    if (!learner) throw new Error('Learner not found');
    return learner;
  }
  const response = await apiClient.get<LearnerWithStatus>(`/api/v1/learners/${learnerId}`);
  return response.data;
}

export async function getLearnerReviews(learnerId: string): Promise<TripartiteReviewSummary[]> {
  if (USE_MOCK) {
    return mockGetLearnerReviews(learnerId);
  }
  const response = await apiClient.get<TripartiteReviewSummary[]>(`/api/v1/learners/${learnerId}/reviews`);
  return response.data;
}
