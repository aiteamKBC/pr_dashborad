import { EvaluationStatus, ReviewEvaluation, ReviewSignOff, SmartAction, TripartiteReview } from '../types/review';
import { isPast, parseISO } from 'date-fns';

export function calculateComplianceScore(evaluations: ReviewEvaluation[]): number {
  if (evaluations.length === 0) return 0;
  
  const sum = evaluations.reduce((acc, evaluation) => {
    switch (evaluation.status) {
      case 'YES':
        return acc + 1;
      case 'PARTIAL':
        return acc + 0.5;
      case 'NO':
        return acc + 0;
      default:
        return acc;
    }
  }, 0);
  
  return Math.round((sum / 13) * 1000) / 10;
}

export function calculatePassCounts(evaluations: ReviewEvaluation[]) {
  return evaluations.reduce(
    (acc, evaluation) => {
      if (evaluation.status === 'YES') acc.yes++;
      else if (evaluation.status === 'PARTIAL') acc.partial++;
      else if (evaluation.status === 'NO') acc.no++;
      return acc;
    },
    { yes: 0, partial: 0, no: 0 }
  );
}

export function calculateRiskFlags(review: TripartiteReview): string[] {
  const flags: string[] = [];
  
  const reviewDate = parseISO(review.reviewDateTime);
  const dueDate = parseISO(review.dueDateTime);
  const isSignOffComplete = review.signOff.learnerSignedAt && review.signOff.employerSignedAt && review.signOff.coachSignedAt;
  
  if (reviewDate > dueDate || (isPast(dueDate) && !isSignOffComplete)) {
    flags.push('overdue');
  }
  
  const attendanceEval = review.evaluations.find(e => e.criterionCode === 'ATTENDANCE');
  if (attendanceEval?.status === 'NO') {
    flags.push('missingAttendance');
  }
  
  const safeguardingEval = review.evaluations.find(e => e.criterionCode === 'SAFEGUARDING');
  if (safeguardingEval?.status === 'NO') {
    flags.push('missingSafeguarding');
  }
  
  const smartActionsEval = review.evaluations.find(e => e.criterionCode === 'SMART_ACTIONS');
  if (smartActionsEval?.status === 'NO' || review.actions.length === 0) {
    flags.push('noSmartActions');
  }
  
  const signOffEval = review.evaluations.find(e => e.criterionCode === 'SIGN_OFF');
  if (!isSignOffComplete || signOffEval?.status !== 'YES') {
    flags.push('notSignedOff');
  }
  
  return flags;
}

export function isSignOffComplete(signOff: ReviewSignOff): boolean {
  return !!(signOff.learnerSignedAt && signOff.employerSignedAt && signOff.coachSignedAt);
}

export function getStatusBadgeColor(status: EvaluationStatus): string {
  switch (status) {
    case 'YES':
      return 'bg-primary-100 text-primary-800';
    case 'PARTIAL':
      return 'bg-amber-100 text-amber-800';
    case 'NO':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getRiskBadgeColor(flag: string): string {
  const highRisk = ['overdue', 'missingSafeguarding', 'missingAttendance'];
  return highRisk.includes(flag) ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
}

export function formatRiskFlag(flag: string): string {
  const labels: Record<string, string> = {
    overdue: 'Overdue',
    missingAttendance: 'Missing Attendance',
    missingSafeguarding: 'Missing Safeguarding',
    noSmartActions: 'No SMART Actions',
    notSignedOff: 'Not Signed Off',
  };
  return labels[flag] || flag;
}