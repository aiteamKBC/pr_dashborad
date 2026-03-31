export type EvaluationStatus = 'YES' | 'PARTIAL' | 'NO';
export type ActionOwnerType = 'LEARNER' | 'EMPLOYER' | 'COACH';
export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';
export type ReviewStatus = 'COMPLETED' | 'PENDING_SIGNOFF' | 'AT_RISK';

export interface Person {
  id: string;
  name: string;
  email: string;
}

export interface Employer {
  name: string;
  email: string;
}

export interface ReviewEvaluation {
  criterionCode: string;
  criterionTitle: string;
  status: EvaluationStatus;
  comment: string;
}

export interface SmartAction {
  id: string;
  ownerType: ActionOwnerType;
  actionText: string;
  linkedKsb: string | null;
  linkedNextStep: string | null;
  dueDate: string | null;
  status: ActionStatus;
}

export interface ReviewSignOff {
  learnerSignedAt: string | null;
  employerSignedAt: string | null;
  coachSignedAt: string | null;
}

export interface TripartiteReview {
  id: string;
  programme: string;
  group: string;
  learner: Person;
  employer: Employer;
  coach: Person;
  reviewDateTime: string;
  dueDateTime: string;
  durationMinutes: number;
  otjHoursReviewed: number;
  otjHoursValue: number;
  strengths: string;
  areasForDevelopment: string;
  overallJudgement: string;
  evaluations: ReviewEvaluation[];
  actions: SmartAction[];
  signOff: ReviewSignOff;
  createdAt: string;
  updatedAt: string;
}

export interface TripartiteReviewSummary extends Omit<TripartiteReview, 'evaluations' | 'actions'> {
  complianceScorePercent: number;
  riskFlags: string[];
  signOffComplete: boolean;
}

export interface ReviewListParams {
  date_from?: string;
  date_to?: string;
  programme?: string;
  group?: string;
  coach_id?: string;
  status?: ReviewStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ReviewListResponse {
  items: TripartiteReviewSummary[];
  total: number;
}

export interface AnalyticsSummary {
  totalReviews: number;
  onTimePercent: number;
  signedOffPercent: number;
  attendanceCompletePercent: number;
  safeguardingCompletePercent: number;
  atRiskCount: number;
}

export interface CriteriaPassRate {
  criterionCode: string;
  criterionTitle: string;
  yesPercent: number;
  partialPercent: number;
  noPercent: number;
}

export interface TrendData {
  bucketLabel: string;
  complianceAvg: number;
  total: number;
  atRisk: number;
}

export interface CoachAnalytics {
  coachId: string;
  coachName: string;
  total: number;
  complianceAvg: number;
  atRiskCount: number;
}

export const CRITERIA_DEFINITIONS = [
  { code: 'TIMEFRAME', title: 'Review within required timeframe' },
  { code: 'DURATION', title: 'Duration (expected 1 hour)' },
  { code: 'ATTENDANCE', title: 'Attendance (learner, employer, skill coach)' },
  { code: 'KSB_PROGRESS', title: 'Progress vs Apprenticeship Standard, KSBs' },
  { code: 'OTJ_REVIEW', title: 'Off the job training hours reviewed and recorded' },
  { code: 'LEARNER_APPLICATION', title: 'Learner explains learning and application at work' },
  { code: 'EMPLOYER_FEEDBACK', title: 'Employer feedback on workplace performance' },
  { code: 'SAFEGUARDING', title: 'Safeguarding and wellbeing check' },
  { code: 'SUPPORT_RISKS', title: 'Support needs or risks identified and addressed' },
  { code: 'SMART_ACTIONS', title: 'SMART actions set for learner, employer, coach' },
  { code: 'ACTIONS_LINKED', title: 'Actions linked to progress gaps or next assessment steps' },
  { code: 'NOTES_QUALITY', title: 'Notes clear, specific, non generic' },
  { code: 'SIGN_OFF', title: 'Review confirmed, signed off by all parties' },
] as const;

// Alias so both import names work
export const REVIEW_CRITERIA = CRITERIA_DEFINITIONS;