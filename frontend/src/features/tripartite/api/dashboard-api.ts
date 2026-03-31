import apiClient from '../../../shared/lib/api-client';
import { LearnerWithStatus } from '../../../shared/types/learner';
import { TripartiteReviewSummary } from '../../../shared/types/review';
import { getAllLearnersWithStatus } from '../../../shared/lib/mock-learners';
import { mockReviews } from '../../../shared/lib/mock-data';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export interface DashboardKPIs {
  totalLearnersInScope: number;
  reviewsDueSoon: number;
  overdueReviews: number;
  completedThisMonth: number;
  complianceRate: number;
}

export interface StatusCounts {
  notStarted: number;
  dueSoon: number;
  overdue: number;
  completed: number;
}

export interface WeeklyTrend {
  weekLabel: string;
  completedCount: number;
}

async function getDashboardKPIs(): Promise<DashboardKPIs> {
  if (USE_MOCK) {
    const learners = getAllLearnersWithStatus();
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const dueSoon = learners.filter(l => l.cycleStatus.status === 'DUE_SOON').length;
    const overdue = learners.filter(l => l.cycleStatus.status === 'OVERDUE').length;
    
    // Count completed reviews this month
    const completedThisMonth = mockReviews.filter(r => {
      const reviewDate = new Date(r.reviewDateTime);
      return reviewDate >= thisMonthStart && reviewDate <= now && r.signOff.learnerSignedAt && r.signOff.employerSignedAt && r.signOff.coachSignedAt;
    }).length;
    
    // Calculate compliance rate (reviews with all criteria YES or PARTIAL and signed off)
    const completedReviews = mockReviews.filter(r => 
      r.signOff.learnerSignedAt && r.signOff.employerSignedAt && r.signOff.coachSignedAt
    );
    const compliantReviews = completedReviews.filter(r => {
      const allCriteriaMet = r.evaluations.every(e => e.status === 'YES' || e.status === 'PARTIAL');
      return allCriteriaMet;
    });
    const complianceRate = completedReviews.length > 0 
      ? Math.round((compliantReviews.length / completedReviews.length) * 100) 
      : 0;
    
    return {
      totalLearnersInScope: learners.length,
      reviewsDueSoon: dueSoon,
      overdueReviews: overdue,
      completedThisMonth,
      complianceRate,
    };
  }

  const response = await apiClient.get<DashboardKPIs>('/api/v1/dashboard/kpis');
  return response.data;
}

async function getDueSoonLearners(): Promise<LearnerWithStatus[]> {
  if (USE_MOCK) {
    const learners = getAllLearnersWithStatus();
    const now = new Date();
    const fourteenDaysFromNow = new Date(now);
    fourteenDaysFromNow.setDate(now.getDate() + 14);
    
    return learners
      .filter(l => {
        if (l.cycleStatus.status !== 'DUE_SOON') return false;
        if (!l.cycleStatus.nextDueDate) return false;
        
        const dueDate = new Date(l.cycleStatus.nextDueDate);
        return dueDate <= fourteenDaysFromNow;
      })
      .sort((a, b) => {
        const dateA = a.cycleStatus.nextDueDate ? new Date(a.cycleStatus.nextDueDate).getTime() : 0;
        const dateB = b.cycleStatus.nextDueDate ? new Date(b.cycleStatus.nextDueDate).getTime() : 0;
        return dateA - dateB;
      });
  }

  const response = await apiClient.get<LearnerWithStatus[]>('/api/v1/dashboard/due-soon');
  return response.data;
}

async function getOverdueLearners(): Promise<LearnerWithStatus[]> {
  if (USE_MOCK) {
    const learners = getAllLearnersWithStatus();
    return learners
      .filter(l => l.cycleStatus.status === 'OVERDUE')
      .sort((a, b) => (b.cycleStatus.daysOverdue || 0) - (a.cycleStatus.daysOverdue || 0));
  }

  const response = await apiClient.get<LearnerWithStatus[]>('/api/v1/dashboard/overdue');
  return response.data;
}

async function getRecentCompletedReviews(): Promise<TripartiteReviewSummary[]> {
  if (USE_MOCK) {
    const completedReviews = mockReviews
      .filter(r => r.signOff.learnerSignedAt && r.signOff.employerSignedAt && r.signOff.coachSignedAt)
      .sort((a, b) => new Date(b.reviewDateTime).getTime() - new Date(a.reviewDateTime).getTime())
      .slice(0, 10);
    
    return completedReviews.map(review => {
      const yesCount = review.evaluations.filter(e => e.status === 'YES').length;
      const partialCount = review.evaluations.filter(e => e.status === 'PARTIAL').length;
      const complianceScore = (yesCount + partialCount * 0.5) / 13 * 100;
      
      return {
        ...review,
        complianceScorePercent: Math.round(complianceScore * 10) / 10,
        riskFlags: [],
        signOffComplete: true,
      };
    });
  }

  const response = await apiClient.get<TripartiteReviewSummary[]>('/api/v1/dashboard/recent-reviews');
  return response.data;
}

async function getStatusCounts(): Promise<StatusCounts> {
  if (USE_MOCK) {
    const learners = getAllLearnersWithStatus();
    return {
      notStarted: learners.filter(l => l.cycleStatus.status === 'NOT_STARTED').length,
      dueSoon: learners.filter(l => l.cycleStatus.status === 'DUE_SOON').length,
      overdue: learners.filter(l => l.cycleStatus.status === 'OVERDUE').length,
      completed: learners.filter(l => l.cycleStatus.status === 'COMPLETED').length,
    };
  }

  const response = await apiClient.get<StatusCounts>('/api/v1/dashboard/status-counts');
  return response.data;
}

async function getWeeklyTrend(): Promise<WeeklyTrend[]> {
  if (USE_MOCK) {
    const now = new Date();
    const weeks: WeeklyTrend[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const completedCount = mockReviews.filter(r => {
        const reviewDate = new Date(r.reviewDateTime);
        return reviewDate >= weekStart && reviewDate <= weekEnd && 
               r.signOff.learnerSignedAt && r.signOff.employerSignedAt && r.signOff.coachSignedAt;
      }).length;
      
      const weekLabel = `${weekStart.getDate()} ${weekStart.toLocaleDateString('en-GB', { month: 'short' })}`;
      weeks.push({ weekLabel, completedCount });
    }
    
    return weeks;
  }

  const response = await apiClient.get<WeeklyTrend[]>('/api/v1/dashboard/weekly-trend');
  return response.data;
}

export const dashboardApi = {
  getDashboardKPIs,
  getDueSoonLearners,
  getOverdueLearners,
  getRecentCompletedReviews,
  getStatusCounts,
  getWeeklyTrend,
};