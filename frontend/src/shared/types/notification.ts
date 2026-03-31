export type NotificationType = 
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'PENDING_SIGNOFF'
  | 'ACTION_DUE'
  | 'CYCLE_REMINDER';

export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  learnerId?: string;
  learnerName?: string;
  reviewId?: string;
  actionId?: string;
  createdAt: string;
  readAt: string | null;
  actionUrl?: string;
}

export interface NotificationListParams {
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  page?: number;
  page_size?: number;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unreadCount: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    type: NotificationType;
    count: number;
    unreadCount: number;
  }[];
}