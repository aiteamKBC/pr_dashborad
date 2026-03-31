
import { LearnerListParams, LearnerListResponse, LearnerWithStatus } from '../types/learner';
import { getAllLearnersWithStatus } from './mock-learners';
import { mockReviews } from './mock-data';
import { TripartiteReviewSummary } from '../types/review';
import { calculateComplianceScore, calculateRiskFlags, isSignOffComplete } from '../utils/review-calculations';

/**
 * Filter and sort learners based on query parameters
 */
export function filterAndSortLearners(
  learners: LearnerWithStatus[],
  params: LearnerListParams
): LearnerWithStatus[] {
  let filtered = [...learners];

  if (params.search) {
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(
      l =>
        l.name.toLowerCase().includes(searchLower) ||
        l.email.toLowerCase().includes(searchLower) ||
        l.employerName.toLowerCase().includes(searchLower)
    );
  }

  if (params.status) {
    filtered = filtered.filter(l => l.cycleStatus.status === params.status);
  }

  if (params.coach_id) {
    filtered = filtered.filter(l => l.coachId === params.coach_id);
  }

  if (params.programme) {
    filtered = filtered.filter(l => l.programme === params.programme);
  }

  if (params.group) {
    filtered = filtered.filter(l => l.group === params.group);
  }

  if (params.due_date_from || params.due_date_to) {
    filtered = filtered.filter(l => {
      const dueDate = l.cycleStatus.nextDueDate;
      if (!dueDate) return false;
      if (params.due_date_from && dueDate < params.due_date_from) return false;
      if (params.due_date_to && dueDate > params.due_date_to) return false;
      return true;
    });
  }

  const sortBy = params.sort_by || 'next_due_date';
  const sortOrder = params.sort_order || 'asc';

  filtered.sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'overdue_first') {
      const aOverdue = a.cycleStatus.daysOverdue || 0;
      const bOverdue = b.cycleStatus.daysOverdue || 0;
      if (aOverdue > 0 && bOverdue === 0) return -1;
      if (aOverdue === 0 && bOverdue > 0) return 1;
      if (aOverdue > 0 && bOverdue > 0) {
        comparison = bOverdue - aOverdue;
      } else {
        const aDays = a.cycleStatus.daysUntilDue ?? 999999;
        const bDays = b.cycleStatus.daysUntilDue ?? 999999;
        comparison = aDays - bDays;
      }
    } else if (sortBy === 'next_due_date') {
      const aDate = a.cycleStatus.nextDueDate || '9999-12-31';
      const bDate = b.cycleStatus.nextDueDate || '9999-12-31';
      comparison = aDate.localeCompare(bDate);
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return filtered;
}

/**
 * Paginate learners
 */
export function paginateLearners(
  learners: LearnerWithStatus[],
  page: number = 1,
  pageSize: number = 20
): LearnerWithStatus[] {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return learners.slice(startIndex, endIndex);
}

/**
 * Mock API: Get learners list with filtering, sorting, and pagination
 */
export async function mockGetLearners(
  params: LearnerListParams = {}
): Promise<LearnerListResponse> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const allLearners = getAllLearnersWithStatus();
  const filtered = filterAndSortLearners(allLearners, params);
  const total = filtered.length;

  const page = params.page || 1;
  const pageSize = params.page_size || 20;
  const paginated = paginateLearners(filtered, page, pageSize);

  return { items: paginated, total };
}

/**
 * Mock API: Get single learner by ID
 */
export async function mockGetLearner(learnerId: string): Promise<LearnerWithStatus | null> {
  await new Promise(resolve => setTimeout(resolve, 200));

  const allLearners = getAllLearnersWithStatus();
  return allLearners.find(l => l.id === learnerId) || null;
}

/**
 * Mock API: Get reviews for a specific learner
 */
export async function mockGetLearnerReviews(learnerId: string): Promise<TripartiteReviewSummary[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  return mockReviews
    .filter(r => r.learner.id === learnerId)
    .sort((a, b) => new Date(b.reviewDateTime).getTime() - new Date(a.reviewDateTime).getTime())
    .map(review => {
      const { evaluations, actions, ...rest } = review;
      return {
        ...rest,
        complianceScorePercent: calculateComplianceScore(evaluations),
        riskFlags: calculateRiskFlags(review),
        signOffComplete: isSignOffComplete(review.signOff),
      };
    });
}
