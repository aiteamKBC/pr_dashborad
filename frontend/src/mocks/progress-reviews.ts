import { addWeeks, subWeeks, format, addDays } from 'date-fns';
import type { ReviewRecord, ChecklistItem, SmartAction, ReviewStatus, AttendanceStatus, ContactOutcome } from '../types/progress-review';

const programmes = [
  'Level 3 Business Administration',
  'Level 4 Data Analyst',
  'Level 5 Operations Manager',
  'Level 3 Customer Service',
  'Level 4 Software Developer',
  'Level 3 Team Leader',
];

const groups = ['Cohort A', 'Cohort B', 'Cohort C', 'Cohort D', 'Cohort E'];

const learners = [
  { id: 'L001', name: 'Emily Thompson', email: 'emily.thompson@example.com', phone: '07700 900123' },
  { id: 'L002', name: 'James Wilson', email: 'james.wilson@example.com', phone: '07700 900124' },
  { id: 'L003', name: 'Sophie Anderson', email: 'sophie.anderson@example.com', phone: '07700 900125' },
  { id: 'L004', name: 'Oliver Brown', email: 'oliver.brown@example.com', phone: '07700 900126' },
  { id: 'L005', name: 'Charlotte Davies', email: 'charlotte.davies@example.com', phone: '07700 900127' },
  { id: 'L006', name: 'Harry Evans', email: 'harry.evans@example.com', phone: '07700 900128' },
  { id: 'L007', name: 'Amelia Roberts', email: 'amelia.roberts@example.com', phone: '07700 900129' },
  { id: 'L008', name: 'George Taylor', email: 'george.taylor@example.com', phone: '07700 900130' },
  { id: 'L009', name: 'Isabella White', email: 'isabella.white@example.com', phone: '07700 900131' },
  { id: 'L010', name: 'Jack Harris', email: 'jack.harris@example.com', phone: '07700 900132' },
  { id: 'L011', name: 'Lily Martin', email: 'lily.martin@example.com', phone: '07700 900133' },
  { id: 'L012', name: 'Thomas Clark', email: 'thomas.clark@example.com', phone: '07700 900134' },
  { id: 'L013', name: 'Grace Lewis', email: 'grace.lewis@example.com', phone: '07700 900135' },
  { id: 'L014', name: 'William Walker', email: 'william.walker@example.com', phone: '07700 900136' },
  { id: 'L015', name: 'Ella Hall', email: 'ella.hall@example.com', phone: '07700 900137' },
];

const employers = [
  { name: 'Sarah Mitchell', email: 'sarah.mitchell@techcorp.co.uk', phone: '020 7946 0001', organisation: 'TechCorp Solutions Ltd' },
  { name: 'Michael Johnson', email: 'michael.johnson@globalfinance.co.uk', phone: '020 7946 0002', organisation: 'Global Finance Group' },
  { name: 'Rachel Green', email: 'rachel.green@healthcareinno.co.uk', phone: '020 7946 0003', organisation: 'Healthcare Innovations' },
  { name: 'David Clarke', email: 'david.clarke@retailexcel.co.uk', phone: '020 7946 0004', organisation: 'Retail Excellence Ltd' },
  { name: 'Emma Watson', email: 'emma.watson@manufacturingpro.co.uk', phone: '020 7946 0005', organisation: 'Manufacturing Pro' },
  { name: 'Robert Smith', email: 'robert.smith@digitalmedia.co.uk', phone: '020 7946 0006', organisation: 'Digital Media Agency' },
];

const coaches = [
  { id: 'C001', name: 'Dr Laura Bennett', email: 'laura.bennett@training.co.uk', phone: '07700 800001' },
  { id: 'C002', name: 'Mark Stevens', email: 'mark.stevens@training.co.uk', phone: '07700 800002' },
  { id: 'C003', name: 'Jennifer Collins', email: 'jennifer.collins@training.co.uk', phone: '07700 800003' },
  { id: 'C004', name: 'Andrew Hughes', email: 'andrew.hughes@training.co.uk', phone: '07700 800004' },
  { id: 'C005', name: 'Victoria Price', email: 'victoria.price@training.co.uk', phone: '07700 800005' },
];

const checklistCategories = [
  'Review held within required timeframe',
  'Duration (expected 1 hour)',
  'Attendance: learner, employer, and skills coach present',
  'Progress discussed against Apprenticeship Standard / KSBs',
  'Off the job training (OTJ) hours reviewed and accurately recorded',
  'Learner explains learning and workplace application',
  'Employer provides meaningful feedback on workplace performance',
  'Safeguarding and wellbeing check completed',
  'Support needs or risks identified and addressed',
  'Clear SMART actions set for learner, employer, and coach',
  'Actions linked to progress gaps or next assessment steps',
  'Review notes are clear, specific, detailed, non generic',
  'Review confirmed / signed off by all parties',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function calculateStatus(lastReviewDate: string): { status: ReviewStatus; warningDate: string; nextDueDate: string } {
  const lastDate = new Date(lastReviewDate);
  const warningDate = addWeeks(lastDate, 10);
  const nextDueDate = addWeeks(lastDate, 12);
  const today = new Date();

  let status: ReviewStatus;
  if (today < warningDate) {
    status = 'COMPLETED';
  } else if (today < nextDueDate) {
    status = 'AT_RISK';
  } else {
    status = 'OVERDUE';
  }

  return {
    status,
    warningDate: warningDate.toISOString(),
    nextDueDate: nextDueDate.toISOString(),
  };
}

function generateChecklist(isCompliant: boolean): ChecklistItem[] {
  return checklistCategories.map((category, index) => {
    let evaluation: 'YES' | 'NO' | 'PARTIAL' | '';
    if (isCompliant) {
      evaluation = Math.random() > 0.1 ? 'YES' : 'PARTIAL';
    } else {
      const rand = Math.random();
      if (rand < 0.5) evaluation = 'YES';
      else if (rand < 0.8) evaluation = 'PARTIAL';
      else evaluation = 'NO';
    }

    const comments = [
      'Fully met with comprehensive evidence provided.',
      'All requirements satisfied. Excellent documentation.',
      'Completed to a high standard with clear examples.',
      'Partially met. Some areas require further development.',
      'Evidence provided but needs more detail.',
      'Not fully achieved. Action plan in place.',
    ];

    return {
      id: index + 1,
      category,
      evaluation,
      comments: evaluation === 'YES' ? comments[Math.floor(Math.random() * 3)] : comments[3 + Math.floor(Math.random() * 3)],
    };
  });
}

function generateActions(count: number): SmartAction[] {
  const actionTexts = [
    'Complete module 3 workbook and submit evidence by due date',
    'Shadow senior team member during client meetings to observe best practices',
    'Review and update personal development plan with coach',
    'Attend health and safety refresher training session',
    'Prepare portfolio evidence for next assessment gateway',
    'Complete online KSB mapping exercise on learning platform',
    'Arrange workplace observation with line manager',
    'Research industry best practices and prepare presentation',
    'Update reflective journal with recent workplace experiences',
    'Complete outstanding functional skills assignments',
  ];

  const owners: SmartAction['owner'][] = ['LEARNER', 'EMPLOYER', 'COACH'];

  return Array.from({ length: count }, (_, i) => ({
    id: `ACT${Date.now()}${i}`,
    owner: owners[i % 3],
    action: actionTexts[Math.floor(Math.random() * actionTexts.length)],
    dueDate: Math.random() > 0.2 ? format(addDays(new Date(), Math.floor(Math.random() * 60) + 7), 'yyyy-MM-dd') : null,
    status: Math.random() > 0.3 ? 'OPEN' : 'DONE',
  }));
}

function generateStrengths(): string[] {
  const strengths = [
    'Demonstrates excellent communication skills in workplace interactions',
    'Shows strong initiative and proactive approach to learning',
    'Successfully applies theoretical knowledge to practical situations',
    'Displays good time management and organisational skills',
    'Works well independently and as part of a team',
    'Shows enthusiasm and commitment to professional development',
  ];
  return strengths.slice(0, Math.floor(Math.random() * 3) + 3);
}

function generateAreasForDevelopment(): string[] {
  const areas = [
    'Continue to develop technical skills in specialist software',
    'Work on building confidence when presenting to larger groups',
    'Ensure all portfolio evidence is uploaded promptly',
    'Improve attention to detail in written documentation',
    'Develop deeper understanding of industry regulations',
    'Strengthen analytical and problem-solving approaches',
  ];
  return areas.slice(0, Math.floor(Math.random() * 2) + 2);
}

const contactOutcomes: ContactOutcome[] = ['NONE', 'NO_ANSWER', 'CONFIRMED_BOOKING', 'CALL_BACK_REQUESTED'];
const noAnswerReasons = [
  'No response after two attempts',
  'Phone switched off',
  'Asked to call back later',
  'Line busy',
];

export function generateMockReviews(): ReviewRecord[] {
  const reviews: ReviewRecord[] = [];

  learners.forEach((learner, index) => {
    const weeksAgo = Math.floor(Math.random() * 12);
    const lastReviewDate = subWeeks(new Date(), weeksAgo);
    const { status, warningDate, nextDueDate } = calculateStatus(lastReviewDate.toISOString());

    const isCompliant = Math.random() > 0.25;
    const hasCompletedReview = Math.random() > 0.3;
    const allPresent = Math.random() > 0.15;

    let attendance: AttendanceStatus;
    if (allPresent) attendance = 'ALL_PRESENT';
    else if (Math.random() > 0.5) attendance = 'PARTIAL';
    else attendance = 'MISSING';

    const duration = 50 + Math.floor(Math.random() * 30);
    const allConfirmed = isCompliant && Math.random() > 0.2;
    const contactOutcome = randomItem(contactOutcomes);

    reviews.push({
      id: `REV${String(index + 1).padStart(4, '0')}`,
      learner,
      employer: randomItem(employers),
      coach: randomItem(coaches),
      programme: randomItem(programmes),
      group: randomItem(groups),
      lastReviewDate: lastReviewDate.toISOString(),
      nextDueDate,
      warningDate,
      status,
      meetingDate: hasCompletedReview ? format(lastReviewDate, 'yyyy-MM-dd') : undefined,
      startTime: hasCompletedReview ? '10:00' : undefined,
      endTime: hasCompletedReview ? `${10 + Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : undefined,
      duration: hasCompletedReview ? duration : undefined,
      location: hasCompletedReview ? (Math.random() > 0.5 ? 'Microsoft Teams' : 'Employer Premises') : undefined,
      meetingLink: hasCompletedReview && Math.random() > 0.5 ? 'https://teams.microsoft.com/l/meetup-join/...' : undefined,
      attendance,
      checklist: hasCompletedReview ? generateChecklist(isCompliant) : [],
      otjHours: Math.floor(Math.random() * 100) + 50,
      otjNotes: hasCompletedReview ? 'OTJ hours verified and accurately recorded. Evidence reviewed and approved.' : '',
      riskLevel: status === 'OVERDUE' ? 'HIGH' : status === 'AT_RISK' ? 'MEDIUM' : 'LOW',
      riskNotes: status === 'OVERDUE' ? 'Urgent action required. Review significantly overdue.' : status === 'AT_RISK' ? 'Review approaching due date. Schedule meeting soon.' : 'No immediate concerns.',
      actions: hasCompletedReview ? generateActions(Math.floor(Math.random() * 4) + 3) : [],
      strengths: hasCompletedReview ? generateStrengths() : [],
      areasForDevelopment: hasCompletedReview ? generateAreasForDevelopment() : [],
      overallJudgement: hasCompletedReview
        ? isCompliant
          ? 'The learner is making excellent progress and is on track to complete the apprenticeship successfully. All key performance indicators are being met consistently. The learner demonstrates strong commitment and applies learning effectively in the workplace.'
          : 'The learner is making satisfactory progress but requires additional support in certain areas. An action plan has been agreed to address identified gaps. Regular monitoring will continue to ensure progress is maintained.'
        : '',
      learnerConfirmed: allConfirmed,
      employerConfirmed: allConfirmed,
      coachConfirmed: allConfirmed,
      signedOff: allConfirmed,
      createdAt: lastReviewDate.toISOString(),
      updatedAt: addDays(lastReviewDate, 2).toISOString(),
      contactOutcome,
      contactReason: contactOutcome === 'NO_ANSWER' ? randomItem(noAnswerReasons) : '',
    });
  });

  return reviews.sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
}

export const mockProgressReviews = generateMockReviews();
