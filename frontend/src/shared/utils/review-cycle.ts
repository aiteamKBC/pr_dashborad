import { LearnerStatus, ReviewCycleStatus } from '../types/learner';

/**
 * Review cycle configuration
 */
export const REVIEW_CYCLE_CONFIG = {
  CYCLE_DAYS: 70, // 10 weeks
  REMINDER_WINDOW_DAYS: 56, // 8 weeks
  DUE_SOON_WINDOW_DAYS: 14, // Last 2 weeks before due
} as const;

/**
 * Calculate the number of days between two dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.floor((utc2 - utc1) / msPerDay);
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the next due date based on last completed review
 */
export function calculateNextDueDate(lastCompletedDate: string | null): string | null {
  if (!lastCompletedDate) return null;
  
  const lastDate = new Date(lastCompletedDate);
  const dueDate = addDays(lastDate, REVIEW_CYCLE_CONFIG.CYCLE_DAYS);
  return dueDate.toISOString().split('T')[0];
}

/**
 * Calculate the reminder start date (8 weeks after last review)
 */
export function calculateReminderStartDate(lastCompletedDate: string | null): string | null {
  if (!lastCompletedDate) return null;
  
  const lastDate = new Date(lastCompletedDate);
  const reminderDate = addDays(lastDate, REVIEW_CYCLE_CONFIG.REMINDER_WINDOW_DAYS);
  return reminderDate.toISOString().split('T')[0];
}

/**
 * Calculate days until due date
 * Returns positive number if due in future, negative if overdue
 */
export function calculateDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  return daysBetween(today, due);
}

/**
 * Calculate days overdue
 * Returns positive number if overdue, null if not overdue
 */
export function calculateDaysOverdue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  
  const daysUntil = calculateDaysUntilDue(dueDate);
  if (daysUntil === null || daysUntil >= 0) return null;
  
  return Math.abs(daysUntil);
}

/**
 * Determine learner status based on review cycle
 */
export function determineLearnerStatus(
  lastCompletedDate: string | null,
  nextDueDate: string | null
): LearnerStatus {
  // No reviews yet
  if (!lastCompletedDate || !nextDueDate) {
    return 'NOT_STARTED';
  }
  
  const daysUntil = calculateDaysUntilDue(nextDueDate);
  
  if (daysUntil === null) {
    return 'NOT_STARTED';
  }
  
  // Overdue
  if (daysUntil < 0) {
    return 'OVERDUE';
  }
  
  // Due soon (within 14 days)
  if (daysUntil <= REVIEW_CYCLE_CONFIG.DUE_SOON_WINDOW_DAYS) {
    return 'DUE_SOON';
  }
  
  // Completed and not yet in reminder window
  return 'COMPLETED';
}

/**
 * Calculate complete review cycle status for a learner
 */
export function calculateReviewCycleStatus(
  learnerId: string,
  lastCompletedDate: string | null,
  totalCompletedReviews: number
): ReviewCycleStatus {
  const nextDueDate = calculateNextDueDate(lastCompletedDate);
  const reminderStartDate = calculateReminderStartDate(lastCompletedDate);
  const status = determineLearnerStatus(lastCompletedDate, nextDueDate);
  const daysUntilDue = calculateDaysUntilDue(nextDueDate);
  const daysOverdue = calculateDaysOverdue(nextDueDate);
  
  return {
    learnerId,
    lastCompletedReviewDate: lastCompletedDate,
    nextDueDate,
    reminderStartDate,
    status,
    daysUntilDue,
    daysOverdue,
    totalCompletedReviews,
  };
}

/**
 * Check if learner is in reminder window (day 56-70)
 */
export function isInReminderWindow(
  lastCompletedDate: string | null,
  nextDueDate: string | null
): boolean {
  if (!lastCompletedDate || !nextDueDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const reminderStart = new Date(calculateReminderStartDate(lastCompletedDate) || '');
  reminderStart.setHours(0, 0, 0, 0);
  
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  
  return today >= reminderStart && today <= due;
}

/**
 * Format status for display
 */
export function formatStatus(status: LearnerStatus): string {
  const statusMap: Record<LearnerStatus, string> = {
    NOT_STARTED: 'Not started',
    DUE_SOON: 'Due soon',
    OVERDUE: 'Overdue',
    COMPLETED: 'Completed',
  };
  
  return statusMap[status];
}

/**
 * Get status colour for badges
 */
export function getStatusColour(status: LearnerStatus): string {
  const colourMap: Record<LearnerStatus, string> = {
    NOT_STARTED: 'bg-gray-100 text-gray-700',
    DUE_SOON: 'bg-amber-100 text-amber-700',
    OVERDUE: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-green-100 text-green-700',
  };
  
  return colourMap[status];
}

/**
 * Format days until/overdue for display
 */
export function formatDaysUntilDue(daysUntilDue: number | null, daysOverdue: number | null): string {
  if (daysOverdue !== null && daysOverdue > 0) {
    return `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
  }
  
  if (daysUntilDue !== null && daysUntilDue >= 0) {
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due in ${daysUntilDue} days`;
  }
  
  return 'Not scheduled';
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}