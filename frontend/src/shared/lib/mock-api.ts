import { mockReviews } from './mock-data';
import { 
  TripartiteReview, 
  TripartiteReviewSummary, 
  ReviewListParams, 
  ReviewListResponse,
  AnalyticsSummary,
  CriteriaPassRate,
  TrendData,
  CoachAnalytics,
  CRITERIA_DEFINITIONS,
} from '../types/review';
import { calculateComplianceScore, calculateRiskFlags, isSignOffComplete } from '../utils/review-calculations';
import { format, startOfWeek, startOfMonth, parseISO, isWithinInterval } from 'date-fns';

function toSummary(review: TripartiteReview): TripartiteReviewSummary {
  const { evaluations, actions, ...rest } = review;
  return {
    ...rest,
    complianceScorePercent: calculateComplianceScore(evaluations),
    riskFlags: calculateRiskFlags(review),
    signOffComplete: isSignOffComplete(review.signOff),
  };
}

export const mockApi = {
  getReviews: async (params: ReviewListParams): Promise<ReviewListResponse> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filtered = [...mockReviews];
    
    if (params.date_from) {
      filtered = filtered.filter(r => new Date(r.reviewDateTime) >= new Date(params.date_from!));
    }
    if (params.date_to) {
      filtered = filtered.filter(r => new Date(r.reviewDateTime) <= new Date(params.date_to!));
    }
    if (params.programme) {
      filtered = filtered.filter(r => r.programme === params.programme);
    }
    if (params.group) {
      filtered = filtered.filter(r => r.group === params.group);
    }
    if (params.coach_id) {
      filtered = filtered.filter(r => r.coach.id === params.coach_id);
    }
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.learner.name.toLowerCase().includes(search) ||
        r.employer.name.toLowerCase().includes(search) ||
        r.coach.name.toLowerCase().includes(search) ||
        r.programme.toLowerCase().includes(search)
      );
    }
    if (params.status) {
      filtered = filtered.filter(r => {
        const summary = toSummary(r);
        if (params.status === 'COMPLETED' && summary.signOffComplete && summary.riskFlags.length === 0) return true;
        if (params.status === 'PENDING_SIGNOFF' && !summary.signOffComplete && summary.riskFlags.length === 0) return true;
        if (params.status === 'AT_RISK' && summary.riskFlags.length > 0) return true;
        return false;
      });
    }
    
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize).map(toSummary);
    
    return { items, total: filtered.length };
  },
  
  getReview: async (id: string): Promise<TripartiteReview> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const review = mockReviews.find(r => r.id === id);
    if (!review) throw new Error('Review not found');
    return review;
  },
  
  createReview: async (data: Partial<TripartiteReview>): Promise<TripartiteReview> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const newReview: TripartiteReview = {
      id: `REV${String(mockReviews.length + 1).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data as TripartiteReview,
    };
    mockReviews.unshift(newReview);
    return newReview;
  },
  
  updateReview: async (id: string, data: Partial<TripartiteReview>): Promise<TripartiteReview> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = mockReviews.findIndex(r => r.id === id);
    if (index === -1) throw new Error('Review not found');
    mockReviews[index] = { ...mockReviews[index], ...data, updatedAt: new Date().toISOString() };
    return mockReviews[index];
  },
  
  updateEvaluations: async (id: string, evaluations: any[]): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const review = mockReviews.find(r => r.id === id);
    if (!review) throw new Error('Review not found');
    review.evaluations = evaluations;
    review.updatedAt = new Date().toISOString();
  },
  
  getActions: async (id: string): Promise<any[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const review = mockReviews.find(r => r.id === id);
    if (!review) throw new Error('Review not found');
    return review.actions;
  },
  
  createAction: async (id: string, action: any): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const review = mockReviews.find(r => r.id === id);
    if (!review) throw new Error('Review not found');
    const newAction = { ...action, id: `ACT${Date.now()}` };
    review.actions.push(newAction);
    return newAction;
  },
  
  updateAction: async (actionId: string, data: any): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    for (const review of mockReviews) {
      const action = review.actions.find(a => a.id === actionId);
      if (action) {
        Object.assign(action, data);
        return action;
      }
    }
    throw new Error('Action not found');
  },
  
  deleteAction: async (actionId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    for (const review of mockReviews) {
      const index = review.actions.findIndex(a => a.id === actionId);
      if (index !== -1) {
        review.actions.splice(index, 1);
        return;
      }
    }
    throw new Error('Action not found');
  },
  
  signOff: async (id: string, data: any): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const review = mockReviews.find(r => r.id === id);
    if (!review) throw new Error('Review not found');
    Object.assign(review.signOff, data);
  },
  
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const summaries = mockReviews.map(toSummary);
    
    return {
      totalReviews: summaries.length,
      onTimePercent: Math.round((summaries.filter(s => !s.riskFlags.includes('overdue')).length / summaries.length) * 100),
      signedOffPercent: Math.round((summaries.filter(s => s.signOffComplete).length / summaries.length) * 100),
      attendanceCompletePercent: Math.round((mockReviews.filter(r => r.evaluations.find(e => e.criterionCode === 'ATTENDANCE')?.status === 'YES').length / mockReviews.length) * 100),
      safeguardingCompletePercent: Math.round((mockReviews.filter(r => r.evaluations.find(e => e.criterionCode === 'SAFEGUARDING')?.status === 'YES').length / mockReviews.length) * 100),
      atRiskCount: summaries.filter(s => s.riskFlags.length > 0).length,
    };
  },
  
  getCriteriaPassRate: async (): Promise<CriteriaPassRate[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return CRITERIA_DEFINITIONS.map(criterion => {
      const evaluations = mockReviews.map(r => r.evaluations.find(e => e.criterionCode === criterion.code)!);
      const total = evaluations.length;
      const yes = evaluations.filter(e => e.status === 'YES').length;
      const partial = evaluations.filter(e => e.status === 'PARTIAL').length;
      const no = evaluations.filter(e => e.status === 'NO').length;
      
      return {
        criterionCode: criterion.code,
        criterionTitle: criterion.title,
        yesPercent: Math.round((yes / total) * 100),
        partialPercent: Math.round((partial / total) * 100),
        noPercent: Math.round((no / total) * 100),
      };
    });
  },
  
  getTrend: async (params: { date_from?: string; date_to?: string; bucket: 'WEEK' | 'MONTH' }): Promise<TrendData[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let filtered = [...mockReviews];
    if (params.date_from && params.date_to) {
      filtered = filtered.filter(r => {
        const date = parseISO(r.reviewDateTime);
        return isWithinInterval(date, { start: parseISO(params.date_from!), end: parseISO(params.date_to!) });
      });
    }
    
    const buckets = new Map<string, TripartiteReview[]>();
    filtered.forEach(review => {
      const date = parseISO(review.reviewDateTime);
      const key = params.bucket === 'WEEK' 
        ? format(startOfWeek(date), 'yyyy-MM-dd')
        : format(startOfMonth(date), 'yyyy-MM');
      
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(review);
    });
    
    return Array.from(buckets.entries()).map(([label, reviews]) => {
      const summaries = reviews.map(toSummary);
      const avgCompliance = summaries.reduce((sum, s) => sum + s.complianceScorePercent, 0) / summaries.length;
      
      return {
        bucketLabel: label,
        complianceAvg: Math.round(avgCompliance * 10) / 10,
        total: reviews.length,
        atRisk: summaries.filter(s => s.riskFlags.length > 0).length,
      };
    }).sort((a, b) => a.bucketLabel.localeCompare(b.bucketLabel));
  },
  
  getCoachAnalytics: async (): Promise<CoachAnalytics[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const coachMap = new Map<string, TripartiteReview[]>();
    mockReviews.forEach(review => {
      if (!coachMap.has(review.coach.id)) coachMap.set(review.coach.id, []);
      coachMap.get(review.coach.id)!.push(review);
    });
    
    return Array.from(coachMap.entries()).map(([coachId, reviews]) => {
      const summaries = reviews.map(toSummary);
      const avgCompliance = summaries.reduce((sum, s) => sum + s.complianceScorePercent, 0) / summaries.length;
      
      return {
        coachId,
        coachName: reviews[0].coach.name,
        total: reviews.length,
        complianceAvg: Math.round(avgCompliance * 10) / 10,
        atRiskCount: summaries.filter(s => s.riskFlags.length > 0).length,
      };
    });
  },
};