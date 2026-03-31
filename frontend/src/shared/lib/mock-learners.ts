import { Learner, LearnerWithStatus } from '../types/learner';
import { calculateReviewCycleStatus, addDays } from '../utils/review-cycle';

/**
 * Mock learner data with varied programmes, groups, coaches, and review histories
 */
export const mockLearners: Learner[] = [
  {
    id: 'L001',
    name: 'Emily Thompson',
    email: 'emily.thompson@example.com',
    programme: 'Level 3 Business Administrator',
    group: 'Cohort 2024-A',
    employerName: 'Acme Corporation Ltd',
    employerEmail: 'hr@acmecorp.co.uk',
    coachId: 'C001',
    coachName: 'Sarah Mitchell',
    coachEmail: 'sarah.mitchell@training.co.uk',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'L002',
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    programme: 'Level 4 Software Developer',
    group: 'Cohort 2024-B',
    employerName: 'TechStart Solutions',
    employerEmail: 'manager@techstart.co.uk',
    coachId: 'C002',
    coachName: 'David Chen',
    coachEmail: 'david.chen@training.co.uk',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z',
  },
  {
    id: 'L003',
    name: 'Sophie Anderson',
    email: 'sophie.anderson@example.com',
    programme: 'Level 3 Customer Service Specialist',
    group: 'Cohort 2024-A',
    employerName: 'Retail Excellence Ltd',
    employerEmail: 'training@retailexcellence.co.uk',
    coachId: 'C001',
    coachName: 'Sarah Mitchell',
    coachEmail: 'sarah.mitchell@training.co.uk',
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-20T09:00:00Z',
  },
  {
    id: 'L004',
    name: 'Mohammed Khan',
    email: 'mohammed.khan@example.com',
    programme: 'Level 4 Data Analyst',
    group: 'Cohort 2024-C',
    employerName: 'DataInsights Group',
    employerEmail: 'hr@datainsights.co.uk',
    coachId: 'C003',
    coachName: 'Rachel Green',
    coachEmail: 'rachel.green@training.co.uk',
    createdAt: '2024-03-01T09:00:00Z',
    updatedAt: '2024-03-01T09:00:00Z',
  },
  {
    id: 'L005',
    name: 'Charlotte Brown',
    email: 'charlotte.brown@example.com',
    programme: 'Level 3 Business Administrator',
    group: 'Cohort 2024-A',
    employerName: 'Global Finance Partners',
    employerEmail: 'admin@globalfinance.co.uk',
    coachId: 'C001',
    coachName: 'Sarah Mitchell',
    coachEmail: 'sarah.mitchell@training.co.uk',
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'L006',
    name: 'Oliver Davies',
    email: 'oliver.davies@example.com',
    programme: 'Level 5 Operations Manager',
    group: 'Cohort 2024-D',
    employerName: 'Manufacturing Solutions UK',
    employerEmail: 'ops@manufacturing.co.uk',
    coachId: 'C004',
    coachName: 'Michael Roberts',
    coachEmail: 'michael.roberts@training.co.uk',
    createdAt: '2024-02-15T09:00:00Z',
    updatedAt: '2024-02-15T09:00:00Z',
  },
  {
    id: 'L007',
    name: 'Amelia Taylor',
    email: 'amelia.taylor@example.com',
    programme: 'Level 4 Software Developer',
    group: 'Cohort 2024-B',
    employerName: 'Digital Innovations Ltd',
    employerEmail: 'hr@digitalinnovations.co.uk',
    coachId: 'C002',
    coachName: 'David Chen',
    coachEmail: 'david.chen@training.co.uk',
    createdAt: '2024-02-05T09:00:00Z',
    updatedAt: '2024-02-05T09:00:00Z',
  },
  {
    id: 'L008',
    name: 'Harry Johnson',
    email: 'harry.johnson@example.com',
    programme: 'Level 3 Customer Service Specialist',
    group: 'Cohort 2024-A',
    employerName: 'Hospitality Group UK',
    employerEmail: 'training@hospitalitygroup.co.uk',
    coachId: 'C001',
    coachName: 'Sarah Mitchell',
    coachEmail: 'sarah.mitchell@training.co.uk',
    createdAt: '2024-01-25T09:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
  },
  {
    id: 'L009',
    name: 'Isabella Martinez',
    email: 'isabella.martinez@example.com',
    programme: 'Level 4 Data Analyst',
    group: 'Cohort 2024-C',
    employerName: 'Analytics Pro Ltd',
    employerEmail: 'manager@analyticspro.co.uk',
    coachId: 'C003',
    coachName: 'Rachel Green',
    coachEmail: 'rachel.green@training.co.uk',
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-03-10T09:00:00Z',
  },
  {
    id: 'L010',
    name: 'George White',
    email: 'george.white@example.com',
    programme: 'Level 5 Operations Manager',
    group: 'Cohort 2024-D',
    employerName: 'Logistics Excellence',
    employerEmail: 'hr@logisticsexcellence.co.uk',
    coachId: 'C004',
    coachName: 'Michael Roberts',
    coachEmail: 'michael.roberts@training.co.uk',
    createdAt: '2024-02-20T09:00:00Z',
    updatedAt: '2024-02-20T09:00:00Z',
  },
  {
    id: 'L011',
    name: 'Lily Evans',
    email: 'lily.evans@example.com',
    programme: 'Level 3 Business Administrator',
    group: 'Cohort 2024-E',
    employerName: 'Professional Services Group',
    employerEmail: 'admin@proservices.co.uk',
    coachId: 'C005',
    coachName: 'Emma Watson',
    coachEmail: 'emma.watson@training.co.uk',
    createdAt: '2024-03-15T09:00:00Z',
    updatedAt: '2024-03-15T09:00:00Z',
  },
  {
    id: 'L012',
    name: 'Jack Robinson',
    email: 'jack.robinson@example.com',
    programme: 'Level 4 Software Developer',
    group: 'Cohort 2024-B',
    employerName: 'CodeCraft Studios',
    employerEmail: 'hr@codecraft.co.uk',
    coachId: 'C002',
    coachName: 'David Chen',
    coachEmail: 'david.chen@training.co.uk',
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-02-10T09:00:00Z',
  },
  {
    id: 'L013',
    name: 'Mia Thomas',
    email: 'mia.thomas@example.com',
    programme: 'Level 3 Customer Service Specialist',
    group: 'Cohort 2024-E',
    employerName: 'Customer First Ltd',
    employerEmail: 'training@customerfirst.co.uk',
    coachId: 'C005',
    coachName: 'Emma Watson',
    coachEmail: 'emma.watson@training.co.uk',
    createdAt: '2024-03-20T09:00:00Z',
    updatedAt: '2024-03-20T09:00:00Z',
  },
  {
    id: 'L014',
    name: 'Noah Harris',
    email: 'noah.harris@example.com',
    programme: 'Level 4 Data Analyst',
    group: 'Cohort 2024-C',
    employerName: 'Business Intelligence Corp',
    employerEmail: 'hr@bicorp.co.uk',
    coachId: 'C003',
    coachName: 'Rachel Green',
    coachEmail: 'rachel.green@training.co.uk',
    createdAt: '2024-03-05T09:00:00Z',
    updatedAt: '2024-03-05T09:00:00Z',
  },
  {
    id: 'L015',
    name: 'Ava Clark',
    email: 'ava.clark@example.com',
    programme: 'Level 5 Operations Manager',
    group: 'Cohort 2024-D',
    employerName: 'Supply Chain Solutions',
    employerEmail: 'manager@supplychains.co.uk',
    coachId: 'C004',
    coachName: 'Michael Roberts',
    coachEmail: 'michael.roberts@training.co.uk',
    createdAt: '2024-02-25T09:00:00Z',
    updatedAt: '2024-02-25T09:00:00Z',
  },
];

/**
 * Mock review completion dates for learners
 * Maps learner ID to array of completed review dates
 */
export const mockReviewHistory: Record<string, string[]> = {
  // Overdue learners (last review > 70 days ago)
  L001: ['2024-09-15'],
  L002: ['2024-08-20', '2024-10-29'],
  
  // Due soon learners (last review 56-70 days ago)
  L003: ['2024-11-25'],
  L004: ['2024-11-28'],
  L005: ['2024-10-15', '2024-12-24'],
  
  // Completed learners (last review < 56 days ago)
  L006: ['2024-12-01', '2025-02-09'],
  L007: ['2024-11-10', '2025-01-19'],
  L008: ['2025-01-25'],
  
  // Not started learners (no reviews)
  // L009, L010, L011, L012, L013, L014, L015 have no entries
};

/**
 * Get learner with calculated cycle status
 */
export function getLearnerWithStatus(learner: Learner): LearnerWithStatus {
  const reviewDates = mockReviewHistory[learner.id] || [];
  const lastCompletedDate = reviewDates.length > 0 
    ? reviewDates[reviewDates.length - 1] 
    : null;
  
  const cycleStatus = calculateReviewCycleStatus(
    learner.id,
    lastCompletedDate,
    reviewDates.length
  );
  
  return {
    ...learner,
    cycleStatus,
  };
}

/**
 * Get all learners with status
 */
export function getAllLearnersWithStatus(): LearnerWithStatus[] {
  return mockLearners.map(getLearnerWithStatus);
}

/**
 * Get unique programmes
 */
export function getUniqueProgrammes(): string[] {
  return Array.from(new Set(mockLearners.map(l => l.programme))).sort();
}

/**
 * Get unique groups
 */
export function getUniqueGroups(): string[] {
  return Array.from(new Set(mockLearners.map(l => l.group))).sort();
}

/**
 * Get unique coaches
 */
export function getUniqueCoaches(): Array<{ id: string; name: string }> {
  const coachMap = new Map<string, string>();
  mockLearners.forEach(l => {
    coachMap.set(l.coachId, l.coachName);
  });
  
  return Array.from(coachMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}