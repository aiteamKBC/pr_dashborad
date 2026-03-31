export interface ReviewCycleSettings {
  cycleDurationWeeks: number;
  reminderWindowWeeks: number;
  autoRemindersEnabled: boolean;
  reminderDaysBefore: number[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface EmailNotificationSettings {
  dueSoonEnabled: boolean;
  overdueEnabled: boolean;
  signOffReminderEnabled: boolean;
  actionDueEnabled: boolean;
  templates: {
    dueSoon: EmailTemplate;
    overdue: EmailTemplate;
    signOffReminder: EmailTemplate;
    actionDue: EmailTemplate;
  };
}

export interface QAChecklistSettings {
  criteria: {
    code: string;
    title: string;
    description: string;
    enabled: boolean;
    order: number;
  }[];
}

export interface SystemSettings {
  reviewCycle: ReviewCycleSettings;
  emailNotifications: EmailNotificationSettings;
  qaChecklist: QAChecklistSettings;
  updatedAt: string;
  updatedBy: string;
}