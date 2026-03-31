import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notifications-api';
import { mockNotificationsApi } from '../../../backend/mock/mock-notifications';
import type { NotificationType, NotificationPriority } from '../../../shared/types/notification';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { useToast } from '../../../shared/hooks/useToast';

const useMockData = import.meta.env.VITE_USE_MOCK === 'true';
const api = useMockData ? mockNotificationsApi : notificationsApi;

const typeLabels: Record<NotificationType, string> = {
  DUE_SOON: 'Due Soon',
  OVERDUE: 'Overdue',
  PENDING_SIGNOFF: 'Pending Sign-off',
  ACTION_DUE: 'Action Due',
  CYCLE_REMINDER: 'Cycle Reminder',
};

const typeColors: Record<NotificationType, string> = {
  DUE_SOON: 'bg-amber-100 text-amber-800 border-amber-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
  PENDING_SIGNOFF: 'bg-blue-100 text-blue-800 border-blue-200',
  ACTION_DUE: 'bg-purple-100 text-purple-800 border-purple-200',
  CYCLE_REMINDER: 'bg-gray-100 text-gray-800 border-gray-200',
};

const priorityColors: Record<NotificationPriority, string> = {
  HIGH: 'text-red-600',
  MEDIUM: 'text-amber-600',
  LOW: 'text-gray-600',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<NotificationType | 'ALL'>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: () => api.getStats(),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', selectedType, showUnreadOnly],
    queryFn: () =>
      api.getNotifications({
        type: selectedType === 'ALL' ? undefined : selectedType,
        read: showUnreadOnly ? false : undefined,
        page: 1,
        page_size: 50,
      }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => api.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      showToast('All notifications marked as read', 'success');
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => api.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      showToast('Notification deleted', 'success');
    },
  });

  const handleNotificationClick = (notificationId: string, actionUrl?: string, readAt?: string | null) => {
    if (!readAt) {
      markAsReadMutation.mutate(notificationId);
    }
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this notification?')) {
      deleteNotificationMutation.mutate(notificationId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <i className="ri-error-warning-line text-4xl text-red-600 mb-3"></i>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Notifications</h3>
          <p className="text-red-700 mb-4">There was an error loading your notifications.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50"
            >
              <i className="ri-check-double-line mr-2"></i>
              Mark All as Read
            </button>
          )}
        </div>
        <p className="text-gray-600">
          {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedType === 'ALL'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600 mt-1">All</div>
            {stats.unread > 0 && (
              <div className="text-xs text-blue-600 font-medium mt-1">{stats.unread} unread</div>
            )}
          </button>

          {stats.byType.map((item) => (
            <button
              key={item.type}
              onClick={() => setSelectedType(item.type)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedType === item.type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl font-bold text-gray-900">{item.count}</div>
              <div className="text-sm text-gray-600 mt-1">{typeLabels[item.type]}</div>
              {item.unreadCount > 0 && (
                <div className="text-xs text-blue-600 font-medium mt-1">{item.unreadCount} unread</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Filter Toggle */}
      <div className="mb-6 flex items-center">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm font-medium text-gray-700">Show unread only</span>
        </label>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <i className="ri-notification-off-line text-6xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
          <p className="text-gray-600">
            {showUnreadOnly
              ? 'You have no unread notifications.'
              : selectedType === 'ALL'
              ? 'You have no notifications at this time.'
              : `You have no ${typeLabels[selectedType]} notifications.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification.id, notification.actionUrl, notification.readAt)}
              className={`bg-white rounded-lg border-2 p-5 transition-all cursor-pointer ${
                notification.readAt
                  ? 'border-gray-200 hover:border-gray-300'
                  : 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${typeColors[notification.type]}`}>
                      {typeLabels[notification.type]}
                    </span>
                    <span className={`text-xs font-medium ${priorityColors[notification.priority]}`}>
                      {notification.priority === 'HIGH' && <i className="ri-alert-fill mr-1"></i>}
                      {notification.priority}
                    </span>
                    {!notification.readAt && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{notification.title}</h3>
                  <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      <i className="ri-time-line mr-1"></i>
                      {formatDate(notification.createdAt)}
                    </span>
                    {notification.learnerName && (
                      <span>
                        <i className="ri-user-line mr-1"></i>
                        {notification.learnerName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, notification.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete notification"
                >
                  <i className="ri-delete-bin-line text-lg"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
