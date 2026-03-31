import type {
  Notification,
  NotificationListParams,
  NotificationListResponse,
  NotificationStats,
  NotificationType,
  NotificationPriority,
} from '../types/notification';

// Mock notification data
const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'OVERDUE',
    priority: 'HIGH',
    title: 'Review Overdue',
    message: 'Sarah Johnson\'s tripartite review is 5 days overdue. Last review was on 15 Nov 2024.',
    learnerId: 'L001',
    learnerName: 'Sarah Johnson',
    reviewId: undefined,
    createdAt: '2025-01-20T09:00:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/learners/L001',
  },
  {
    id: 'notif-002',
    type: 'DUE_SOON',
    priority: 'MEDIUM',
    title: 'Review Due Soon',
    message: 'Michael Chen\'s review is due in 10 days. Schedule a meeting with all parties.',
    learnerId: 'L002',
    learnerName: 'Michael Chen',
    createdAt: '2025-01-21T10:30:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/learners/L002',
  },
  {
    id: 'notif-003',
    type: 'PENDING_SIGNOFF',
    priority: 'MEDIUM',
    title: 'Sign-off Pending',
    message: 'Review for Emma Wilson is awaiting employer sign-off. Completed on 18 Jan 2025.',
    learnerId: 'L003',
    learnerName: 'Emma Wilson',
    reviewId: 'REV-003',
    createdAt: '2025-01-22T14:15:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/reviews/REV-003',
  },
  {
    id: 'notif-004',
    type: 'OVERDUE',
    priority: 'HIGH',
    title: 'Review Overdue',
    message: 'James Taylor\'s tripartite review is 12 days overdue. Immediate action required.',
    learnerId: 'L004',
    learnerName: 'James Taylor',
    createdAt: '2025-01-19T08:00:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/learners/L004',
  },
  {
    id: 'notif-005',
    type: 'DUE_SOON',
    priority: 'MEDIUM',
    title: 'Review Due Soon',
    message: 'Olivia Brown\'s review is due in 7 days. Reminder window has started.',
    learnerId: 'L005',
    learnerName: 'Olivia Brown',
    createdAt: '2025-01-21T11:00:00Z',
    readAt: '2025-01-22T09:30:00Z',
    actionUrl: '/tripartite-reviews/learners/L005',
  },
  {
    id: 'notif-006',
    type: 'ACTION_DUE',
    priority: 'LOW',
    title: 'Action Due Tomorrow',
    message: 'SMART action for Daniel Martinez is due tomorrow: "Complete KSB portfolio evidence".',
    learnerId: 'L006',
    learnerName: 'Daniel Martinez',
    actionId: 'ACT-123',
    createdAt: '2025-01-22T16:00:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/learners/L006',
  },
  {
    id: 'notif-007',
    type: 'PENDING_SIGNOFF',
    priority: 'MEDIUM',
    title: 'Sign-off Pending',
    message: 'Review for Sophie Anderson is awaiting learner and coach sign-off.',
    learnerId: 'L007',
    learnerName: 'Sophie Anderson',
    reviewId: 'REV-007',
    createdAt: '2025-01-20T13:45:00Z',
    readAt: '2025-01-21T10:00:00Z',
    actionUrl: '/tripartite-reviews/reviews/REV-007',
  },
  {
    id: 'notif-008',
    type: 'DUE_SOON',
    priority: 'MEDIUM',
    title: 'Review Due Soon',
    message: 'Liam Thompson\'s review is due in 5 days. Please schedule as soon as possible.',
    learnerId: 'L008',
    learnerName: 'Liam Thompson',
    createdAt: '2025-01-22T09:00:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/learners/L008',
  },
  {
    id: 'notif-009',
    type: 'CYCLE_REMINDER',
    priority: 'LOW',
    title: 'Cycle Reminder',
    message: '8 reviews are entering the reminder window this week. Plan ahead.',
    createdAt: '2025-01-22T07:00:00Z',
    readAt: '2025-01-22T08:00:00Z',
    actionUrl: '/tripartite-reviews',
  },
  {
    id: 'notif-010',
    type: 'OVERDUE',
    priority: 'HIGH',
    title: 'Review Overdue',
    message: 'Ava Robinson\'s tripartite review is 3 days overdue. Contact all parties urgently.',
    learnerId: 'L010',
    learnerName: 'Ava Robinson',
    createdAt: '2025-01-21T09:30:00Z',
    readAt: null,
    actionUrl: '/tripartite-reviews/learners/L010',
  },
];

export const mockNotificationsApi = {
  getNotifications: async (params: NotificationListParams): Promise<NotificationListResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    let filtered = [...mockNotifications];

    // Filter by type
    if (params.type) {
      filtered = filtered.filter((n) => n.type === params.type);
    }

    // Filter by priority
    if (params.priority) {
      filtered = filtered.filter((n) => n.priority === params.priority);
    }

    // Filter by read status
    if (params.read !== undefined) {
      filtered = filtered.filter((n) => (params.read ? n.readAt !== null : n.readAt === null));
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const unreadCount = mockNotifications.filter((n) => n.readAt === null).length;

    // Pagination
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = filtered.slice(start, end);

    return {
      items,
      total,
      unreadCount,
    };
  },

  getStats: async (): Promise<NotificationStats> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const total = mockNotifications.length;
    const unread = mockNotifications.filter((n) => n.readAt === null).length;

    const types: NotificationType[] = ['DUE_SOON', 'OVERDUE', 'PENDING_SIGNOFF', 'ACTION_DUE', 'CYCLE_REMINDER'];
    const byType = types.map((type) => {
      const notifications = mockNotifications.filter((n) => n.type === type);
      return {
        type,
        count: notifications.length,
        unreadCount: notifications.filter((n) => n.readAt === null).length,
      };
    });

    return {
      total,
      unread,
      byType,
    };
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const notification = mockNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.readAt = new Date().toISOString();
    }
  },

  markAllAsRead: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    mockNotifications.forEach((n) => {
      if (n.readAt === null) {
        n.readAt = new Date().toISOString();
      }
    });
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const index = mockNotifications.findIndex((n) => n.id === notificationId);
    if (index !== -1) {
      mockNotifications.splice(index, 1);
    }
  },
};