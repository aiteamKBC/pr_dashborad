import { LearnerWithStatus } from '../../../shared/types/learner';
import { formatDate } from '../../../backend/utils/review-cycle';

interface StatusTimelineProps {
  learner: LearnerWithStatus;
}

export function StatusTimeline({ learner }: StatusTimelineProps) {
  const { cycleStatus } = learner;
  const today = new Date();

  // Calculate timeline positions
  const getTimelineData = () => {
    if (!cycleStatus.lastReviewDate) {
      return {
        showTimeline: false,
        message: 'No reviews completed yet. Schedule the first review to begin tracking progress.',
      };
    }

    const lastReview = new Date(cycleStatus.lastReviewDate);
    const reminderDate = new Date(cycleStatus.reminderStartDate!);
    const dueDate = new Date(cycleStatus.nextDueDate!);

    const totalDays = 70;
    const daysSinceLastReview = Math.floor((today.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercent = Math.min((daysSinceLastReview / totalDays) * 100, 100);

    const reminderDays = 56;
    const reminderPercent = (reminderDays / totalDays) * 100;

    return {
      showTimeline: true,
      lastReview,
      reminderDate,
      dueDate,
      progressPercent,
      reminderPercent,
      daysSinceLastReview,
      isInReminderWindow: cycleStatus.status === 'DUE_SOON',
      isOverdue: cycleStatus.status === 'OVERDUE',
    };
  };

  const timeline = getTimelineData();

  if (!timeline.showTimeline) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Cycle Timeline</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <i className="ri-calendar-line text-4xl text-gray-300 mb-3"></i>
            <p className="text-sm text-gray-500">{timeline.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Cycle Timeline</h2>

      {/* Timeline visualization */}
      <div className="relative mb-8">
        {/* Progress bar background */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          {/* Completed progress */}
          <div
            className={`h-full transition-all duration-500 ${
              timeline.isOverdue
                ? 'bg-red-500'
                : timeline.isInReminderWindow
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${timeline.progressPercent}%` }}
          />
        </div>

        {/* Reminder marker */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-amber-600"
          style={{ left: `${timeline.reminderPercent}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-600 rounded-full" />
        </div>

        {/* Due date marker */}
        <div className="absolute top-0 right-0 h-3 w-0.5 bg-gray-400">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-400 rounded-full" />
        </div>
      </div>

      {/* Timeline labels */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        {/* Last Review */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <p className="font-medium text-gray-900">Last Review</p>
          </div>
          <p className="text-xs text-gray-500 ml-4">
            {formatDate(timeline.lastReview)}
          </p>
          <p className="text-xs text-gray-400 ml-4">
            {timeline.daysSinceLastReview} days ago
          </p>
        </div>

        {/* Reminder Window */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-amber-600 rounded-full" />
            <p className="font-medium text-gray-900">Reminder Window</p>
          </div>
          <p className="text-xs text-gray-500 ml-4">
            {formatDate(timeline.reminderDate)}
          </p>
          <p className="text-xs text-gray-400 ml-4">Day 56 (8 weeks)</p>
        </div>

        {/* Due Date */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full" />
            <p className="font-medium text-gray-900">Due Date</p>
          </div>
          <p className="text-xs text-gray-500 ml-4">
            {formatDate(timeline.dueDate)}
          </p>
          <p className="text-xs text-gray-400 ml-4">Day 70 (10 weeks)</p>
        </div>
      </div>

      {/* Status message */}
      {timeline.isOverdue && cycleStatus.daysOverdue && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="ri-alert-line text-red-600 text-lg mt-0.5"></i>
            <div>
              <p className="text-sm font-medium text-red-900">Review Overdue</p>
              <p className="text-xs text-red-700 mt-1">
                This review is {cycleStatus.daysOverdue} days overdue. Please schedule a meeting as soon as possible.
              </p>
            </div>
          </div>
        </div>
      )}

      {timeline.isInReminderWindow && cycleStatus.daysUntilDue && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <i className="ri-time-line text-amber-600 text-lg mt-0.5"></i>
            <div>
              <p className="text-sm font-medium text-amber-900">Review Due Soon</p>
              <p className="text-xs text-amber-700 mt-1">
                Meeting due in {cycleStatus.daysUntilDue} days. Please schedule the review within the next 2 weeks.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusTimeline;
