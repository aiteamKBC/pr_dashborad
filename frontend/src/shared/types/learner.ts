export type LearnerStatus = 'NOT_STARTED' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';

export interface Learner {
  id: string;
  name: string;
  email: string;
  programme: string;
  group: string;
  employerName: string;
  employerEmail: string;
  coachId: string;
  coachName: string;
  coachEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewCycleStatus {
  learnerId: string;
  lastCompletedReviewDate: string | null;
  nextDueDate: string | null;
  reminderStartDate: string | null;
  status: LearnerStatus;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  totalCompletedReviews: number;
}

export interface LearnerWithStatus extends Learner {
  cycleStatus: ReviewCycleStatus;
}

export interface LearnerListParams {
  search?: string;
  status?: LearnerStatus;
  coach_id?: string;
  programme?: string;
  group?: string;
  due_date_from?: string;
  due_date_to?: string;
  sort_by?: 'next_due_date' | 'overdue_first' | 'name';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface LearnerListResponse {
  items: LearnerWithStatus[];
  total: number;
}