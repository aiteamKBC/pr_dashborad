import type { SystemSettings } from '../types/settings';

const defaultSettings: SystemSettings = {
  reviewCycle: {
    cycleDurationWeeks: 10,
    reminderWindowWeeks: 8,
    autoRemindersEnabled: true,
    reminderDaysBefore: [14, 7, 3, 1],
  },
  emailNotifications: {
    dueSoonEnabled: true,
    overdueEnabled: true,
    signOffReminderEnabled: true,
    actionDueEnabled: true,
    templates: {
      dueSoon: {
        id: 'tpl-due-soon',
        name: 'Review Due Soon',
        subject: 'Tripartite Review Due Soon - {{learnerName}}',
        body: 'Dear {{recipientName}},\n\nThis is a reminder that a tripartite progress review for {{learnerName}} is due in {{daysUntilDue}} days.\n\nReview Details:\n- Learner: {{learnerName}}\n- Programme: {{programme}}\n- Due Date: {{dueDate}}\n\nPlease schedule a meeting with all three parties (Learner, Skills Coach, and Employer) as soon as possible.\n\nBest regards,\nTripartite Review System',
        variables: ['recipientName', 'learnerName', 'daysUntilDue', 'programme', 'dueDate'],
      },
      overdue: {
        id: 'tpl-overdue',
        name: 'Review Overdue',
        subject: 'URGENT: Tripartite Review Overdue - {{learnerName}}',
        body: 'Dear {{recipientName}},\n\nThis is an urgent reminder that a tripartite progress review for {{learnerName}} is now {{daysOverdue}} days overdue.\n\nReview Details:\n- Learner: {{learnerName}}\n- Programme: {{programme}}\n- Original Due Date: {{dueDate}}\n- Last Review: {{lastReviewDate}}\n\nImmediate action is required. Please schedule and complete this review as soon as possible to maintain compliance.\n\nBest regards,\nTripartite Review System',
        variables: ['recipientName', 'learnerName', 'daysOverdue', 'programme', 'dueDate', 'lastReviewDate'],
      },
      signOffReminder: {
        id: 'tpl-signoff',
        name: 'Sign-off Reminder',
        subject: 'Review Sign-off Required - {{learnerName}}',
        body: 'Dear {{recipientName}},\n\nA tripartite review for {{learnerName}} has been completed and is awaiting your sign-off confirmation.\n\nReview Details:\n- Learner: {{learnerName}}\n- Programme: {{programme}}\n- Review Date: {{reviewDate}}\n- Completed By: {{completedBy}}\n\nPlease review the meeting notes and sign off to confirm your agreement with the outcomes and actions.\n\nView Review: {{reviewUrl}}\n\nBest regards,\nTripartite Review System',
        variables: ['recipientName', 'learnerName', 'programme', 'reviewDate', 'completedBy', 'reviewUrl'],
      },
      actionDue: {
        id: 'tpl-action-due',
        name: 'Action Due Reminder',
        subject: 'SMART Action Due Soon - {{learnerName}}',
        body: 'Dear {{recipientName}},\n\nA SMART action assigned to you from {{learnerName}}\'s tripartite review is due soon.\n\nAction Details:\n- Action: {{actionText}}\n- Due Date: {{actionDueDate}}\n- Status: {{actionStatus}}\n- Linked KSB: {{linkedKsb}}\n\nPlease complete this action by the due date and update the status in the system.\n\nBest regards,\nTripartite Review System',
        variables: ['recipientName', 'learnerName', 'actionText', 'actionDueDate', 'actionStatus', 'linkedKsb'],
      },
    },
  },
  qaChecklist: {
    criteria: [
      {
        code: 'TIMEFRAME',
        title: 'Review held within required timeframe',
        description: 'The review was conducted within the 10-week cycle window',
        enabled: true,
        order: 1,
      },
      {
        code: 'DURATION',
        title: 'Duration (expected one hour)',
        description: 'The review lasted approximately one hour',
        enabled: true,
        order: 2,
      },
      {
        code: 'ATTENDANCE',
        title: 'Attendance (learner, employer, and skill coach all attended)',
        description: 'All three parties were present for the review',
        enabled: true,
        order: 3,
      },
      {
        code: 'KSB_PROGRESS',
        title: 'Progress clearly discussed against the apprenticeship standard / KSBs',
        description: 'Progress was reviewed against specific Knowledge, Skills, and Behaviours',
        enabled: true,
        order: 4,
      },
      {
        code: 'OTJ_REVIEW',
        title: 'Off the job training hours reviewed and accurately recorded',
        description: 'OTJ hours were discussed and documented correctly',
        enabled: true,
        order: 5,
      },
      {
        code: 'LEARNER_APPLICATION',
        title: 'Learner can explain what they have learned and applied at work',
        description: 'The learner demonstrated understanding and workplace application',
        enabled: true,
        order: 6,
      },
      {
        code: 'EMPLOYER_FEEDBACK',
        title: 'Employer provides meaningful feedback on workplace performance',
        description: 'The employer gave specific, constructive feedback',
        enabled: true,
        order: 7,
      },
      {
        code: 'SAFEGUARDING',
        title: 'Safeguarding and wellbeing check completed',
        description: 'Safeguarding and wellbeing were discussed',
        enabled: true,
        order: 8,
      },
      {
        code: 'SUPPORT_RISKS',
        title: 'Any support needs or risks identified and addressed',
        description: 'Support needs and risks were identified and action taken',
        enabled: true,
        order: 9,
      },
      {
        code: 'SMART_ACTIONS',
        title: 'Clear SMART actions set for learner, employer, and coach',
        description: 'Specific, Measurable, Achievable, Relevant, Time-bound actions were set',
        enabled: true,
        order: 10,
      },
      {
        code: 'ACTIONS_LINKED',
        title: 'Actions linked to progress gaps or next assessment steps / EPA readiness',
        description: 'Actions are connected to identified gaps or EPA preparation',
        enabled: true,
        order: 11,
      },
      {
        code: 'NOTES_QUALITY',
        title: 'Review notes are clear, specific, and not generic',
        description: 'Notes are detailed and personalised to the learner',
        enabled: true,
        order: 12,
      },
      {
        code: 'SIGN_OFF',
        title: 'Review confirmed / signed off by all parties',
        description: 'All three parties have confirmed and signed off the review',
        enabled: true,
        order: 13,
      },
    ],
  },
  updatedAt: '2025-01-15T10:00:00Z',
  updatedBy: 'System Administrator',
};

let currentSettings: SystemSettings = JSON.parse(JSON.stringify(defaultSettings));

export const mockSettingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return JSON.parse(JSON.stringify(currentSettings));
  },

  updateSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    
    currentSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Current User',
    };
    
    return JSON.parse(JSON.stringify(currentSettings));
  },

  resetToDefaults: async (): Promise<SystemSettings> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    currentSettings = JSON.parse(JSON.stringify(defaultSettings));
    currentSettings.updatedAt = new Date().toISOString();
    currentSettings.updatedBy = 'Current User';
    return JSON.parse(JSON.stringify(currentSettings));
  },
};