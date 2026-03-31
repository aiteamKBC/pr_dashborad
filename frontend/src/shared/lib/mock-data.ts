import { TripartiteReview, CRITERIA_DEFINITIONS, EvaluationStatus } from '../types/review';
import { addDays, subDays, format } from 'date-fns';

const programmes = ['Level 3 Business Administration', 'Level 4 Data Analyst', 'Level 5 Operations Manager', 'Level 3 Customer Service', 'Level 4 Software Developer'];
const groups = ['Cohort A', 'Cohort B', 'Cohort C', 'Cohort D'];

const learners = [
  { id: 'L001', name: 'Emily Thompson', email: 'emily.thompson@example.com' },
  { id: 'L002', name: 'James Wilson', email: 'james.wilson@example.com' },
  { id: 'L003', name: 'Sophie Anderson', email: 'sophie.anderson@example.com' },
  { id: 'L004', name: 'Oliver Brown', email: 'oliver.brown@example.com' },
  { id: 'L005', name: 'Charlotte Davies', email: 'charlotte.davies@example.com' },
  { id: 'L006', name: 'Harry Evans', email: 'harry.evans@example.com' },
  { id: 'L007', name: 'Amelia Roberts', email: 'amelia.roberts@example.com' },
  { id: 'L008', name: 'George Taylor', email: 'george.taylor@example.com' },
  { id: 'L009', name: 'Isabella White', email: 'isabella.white@example.com' },
  { id: 'L010', name: 'Jack Harris', email: 'jack.harris@example.com' },
];

const employers = [
  { name: 'TechCorp Solutions Ltd', email: 'hr@techcorp.co.uk' },
  { name: 'Global Finance Group', email: 'training@globalfinance.co.uk' },
  { name: 'Healthcare Innovations', email: 'apprenticeships@healthcareinno.co.uk' },
  { name: 'Retail Excellence Ltd', email: 'development@retailexcel.co.uk' },
  { name: 'Manufacturing Pro', email: 'learning@manufacturingpro.co.uk' },
];

const coaches = [
  { id: 'C001', name: 'Dr Sarah Mitchell', email: 'sarah.mitchell@training.co.uk' },
  { id: 'C002', name: 'Michael Johnson', email: 'michael.johnson@training.co.uk' },
  { id: 'C003', name: 'Rachel Green', email: 'rachel.green@training.co.uk' },
  { id: 'C004', name: 'David Clarke', email: 'david.clarke@training.co.uk' },
];

const statuses: EvaluationStatus[] = ['YES', 'PARTIAL', 'NO'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStatus(weights: [number, number, number] = [0.7, 0.2, 0.1]): EvaluationStatus {
  const rand = Math.random();
  if (rand < weights[0]) return 'YES';
  if (rand < weights[0] + weights[1]) return 'PARTIAL';
  return 'NO';
}

function generateEvaluations(isCompliant: boolean): any[] {
  return CRITERIA_DEFINITIONS.map(criterion => ({
    criterionCode: criterion.code,
    criterionTitle: criterion.title,
    status: isCompliant ? randomStatus([0.85, 0.1, 0.05]) : randomStatus([0.4, 0.3, 0.3]),
    comment: isCompliant 
      ? `${criterion.title} was thoroughly completed. All requirements met with clear evidence provided during the review session.`
      : `${criterion.title} requires attention. Some aspects need improvement or further documentation.`,
  }));
}

function generateActions(count: number): any[] {
  const actionTexts = [
    'Complete module 3 workbook and submit evidence by due date',
    'Shadow senior team member during client meetings',
    'Review and update personal development plan',
    'Attend health and safety refresher training',
    'Prepare portfolio evidence for next assessment',
    'Complete online KSB mapping exercise',
    'Arrange workplace observation with line manager',
    'Research industry best practices for upcoming project',
  ];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `ACT${Date.now()}${i}`,
    ownerType: randomItem(['LEARNER', 'EMPLOYER', 'COACH'] as const),
    actionText: randomItem(actionTexts),
    linkedKsb: Math.random() > 0.5 ? `K${Math.floor(Math.random() * 20) + 1}` : null,
    linkedNextStep: Math.random() > 0.7 ? 'Gateway preparation' : null,
    dueDate: format(addDays(new Date(), Math.floor(Math.random() * 60) + 7), 'yyyy-MM-dd'),
    status: randomItem(['OPEN', 'IN_PROGRESS', 'DONE'] as const),
  }));
}

export function generateMockReviews(): TripartiteReview[] {
  const reviews: TripartiteReview[] = [];
  
  for (let i = 0; i < 45; i++) {
    const isCompliant = Math.random() > 0.25;
    const reviewDate = subDays(new Date(), Math.floor(Math.random() * 90));
    const dueDate = isCompliant ? addDays(reviewDate, -5) : subDays(reviewDate, Math.floor(Math.random() * 10));
    const hasSignOff = isCompliant ? Math.random() > 0.1 : Math.random() > 0.6;
    
    reviews.push({
      id: `REV${String(i + 1).padStart(4, '0')}`,
      programme: randomItem(programmes),
      group: randomItem(groups),
      learner: randomItem(learners),
      employer: randomItem(employers),
      coach: randomItem(coaches),
      reviewDateTime: reviewDate.toISOString(),
      dueDateTime: dueDate.toISOString(),
      durationMinutes: 50 + Math.floor(Math.random() * 30),
      otjHoursReviewed: Math.floor(Math.random() * 100) + 50,
      otjHoursValue: Math.floor(Math.random() * 80) + 40,
      strengths: 'The learner demonstrates excellent communication skills and shows strong initiative in workplace tasks. They have successfully applied theoretical knowledge to practical situations, particularly in customer service scenarios. Time management has improved significantly since the last review.',
      areasForDevelopment: 'Continue to develop technical skills in data analysis software. Work on building confidence when presenting to larger groups. Ensure all portfolio evidence is uploaded promptly to the online platform.',
      overallJudgement: isCompliant 
        ? 'The learner is making excellent progress and is on track to complete the apprenticeship successfully. All key performance indicators are being met consistently.'
        : 'The learner is making satisfactory progress but requires additional support in certain areas. Action plan has been agreed to address identified gaps.',
      evaluations: generateEvaluations(isCompliant),
      actions: generateActions(Math.floor(Math.random() * 4) + 2),
      signOff: {
        learnerSignedAt: hasSignOff ? addDays(reviewDate, 1).toISOString() : null,
        employerSignedAt: hasSignOff ? addDays(reviewDate, 1).toISOString() : null,
        coachSignedAt: hasSignOff ? addDays(reviewDate, 1).toISOString() : null,
      },
      createdAt: reviewDate.toISOString(),
      updatedAt: addDays(reviewDate, 2).toISOString(),
    });
  }
  
  return reviews.sort((a, b) => new Date(b.reviewDateTime).getTime() - new Date(a.reviewDateTime).getTime());
}

export const mockReviews = generateMockReviews();