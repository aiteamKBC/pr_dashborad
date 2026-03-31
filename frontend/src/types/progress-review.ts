// ─── Progress Review Types ───────────────────────────────────────────────────

export type ReviewStatus = 'COMPLETED' | 'BOOKING' | 'AT_RISK' | 'OVERDUE';
export type AttendanceStatus = 'ALL_PRESENT' | 'PARTIAL' | 'MISSING';
export type ChecklistStatus = 'YES' | 'NO' | 'PARTIAL';
export type ActionOwner = 'LEARNER' | 'EMPLOYER' | 'COACH';
export type ActionStatus = 'OPEN' | 'DONE';
export type ContactOutcome = 'NONE' | 'NO_ANSWER' | 'CONFIRMED_BOOKING' | 'CALL_BACK_REQUESTED';

export interface Participant {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Employer {
  name: string;
  email?: string;
  phone?: string;
  organisation?: string;
}

export interface ChecklistItem {
  id: number;
  category: string;
  evaluation: ChecklistStatus | '';
  comments: string;
}

export interface SmartAction {
  id: string;
  owner: ActionOwner;
  action: string;
  dueDate: string | null;
  status: ActionStatus;
}

export interface ReviewRecord {
  id: string;
  learner: Participant;
  employer: Employer;
  coach: Participant;
  programme: string;
  group: string;
  lastReviewDate: string;
  nextDueDate: string;
  warningDate: string;
  status: ReviewStatus;
  nextReviewStatus?: ReviewStatus;
  meetingDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  attendance: AttendanceStatus;
  checklist: ChecklistItem[];
  otjHours: number;
  otjNotes: string;
  plannedOtj?: number | null;
  submittedOtj?: number | null;
  expectedOtj?: number | null;
  otjHoursStatus?: string;
  otjCalculatedHours?: number | null;
  otjProgrammeHours?: number | null;
  otjTotalDays?: number | null;
  otjElapsedDays?: number | null;
  otjPlannedHours?: number | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskNotes: string;
  actions: SmartAction[];
  strengths: string[];
  areasForDevelopment: string[];
  overallJudgement: string;
  learnerConfirmed: boolean;
  employerConfirmed: boolean;
  coachConfirmed: boolean;
  signedOff: boolean;
  createdAt: string;
  updatedAt: string;
  reportText?: string;
  overallRating?: string;
  contactOutcome?: ContactOutcome;
  contactReason?: string;
}

export interface DashboardKPIs {
  totalLearners: number;
  reviewsCompleted: number;
  booking: number;
  atRisk: number;
  overdue: number;
  attendanceCompliance: number;
}

export interface TrendData {
  week: string;
  completed: number;
  booking: number;
  atRisk: number;
  overdue: number;
}

export interface ComplianceData {
  criterion: string;
  percentage: number;
}
