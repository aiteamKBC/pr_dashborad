import apiClient from '../../../shared/lib/api-client';
import type {
  Notification,
  NotificationListParams,
  NotificationListResponse,
  NotificationStats,
} from '../../../shared/types/notification';

export const notificationsApi = {
  getNotifications: async (params: NotificationListParams): Promise<NotificationListResponse> => {
    const response = await apiClient.get<NotificationListResponse>('/api/v1/notifications', {
      params,
    });
    return response.data;
  },

  getStats: async (): Promise<NotificationStats> => {
    const response = await apiClient.get<NotificationStats>('/api/v1/notifications/stats');
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/api/v1/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post('/api/v1/notifications/read-all');
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/notifications/${notificationId}`);
  },
};