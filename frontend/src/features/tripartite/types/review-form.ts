export interface ReviewFormData {
  // Step 1: Participants and Meeting
  learner: {
    name: string;
    email: string;
  };
  coach: {
    name: string;
    email: string;
  };
  employer: {
    name: string;
    email: string;
  };
  meetingDate: string;
  meetingTime: string;
  meetingType: 'teams' | 'in-person' | 'phone' | 'zoom';
  location: string;
  durationMinutes: number;
  programme: string;
  group: string;

  // Step 2: Evidence and Notes
  progressNotes: string;
  otjHoursSinceLastReview: number;
  otjHoursTotal: number;
  otjEvidence: string;
  learnerLearningNotes: string;
  employerFeedbackNotes: string;
  safeguarding: {
    completed: boolean;
    notes: string;
  };
  supportNeeds: {
    identified: boolean;
    riskSummary: string;
    mitigationActions: string;
  };

  // Step 3: QA Checklist
  checklist: Array<{
    code: string;
    title: string;
    status: 'YES' | 'PARTIAL' | 'NO' | '';
    comment: string;
  }>;
  strengths: string;
  areasForDevelopment: string;
  overallJudgement: string;

  // Step 4: Actions and Sign Off
  actions: Array<{
    id: string;
    owner: 'LEARNER' | 'EMPLOYER' | 'COACH';
    actionText: string;
    dueDate: string | null;
    linkedGap: string | null;
    status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
  }>;
  signOff: {
    learnerSignedAt: string | null;
    employerSignedAt: string | null;
    coachSignedAt: string | null;
  };
}