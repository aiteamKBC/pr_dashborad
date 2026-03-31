import { LearnerWithStatus } from '../../../shared/types/learner';
import Button from '../../../shared/components/Button';
import { formatDate } from '../../../backend/utils/review-cycle';
import { useNavigate } from 'react-router-dom';

interface NextReviewPanelProps {
  learner: LearnerWithStatus;
}

export function NextReviewPanel({ learner }: NextReviewPanelProps) {
  const navigate = useNavigate();
  const { cycleStatus } = learner;

  const handleScheduleReview = () => {
    navigate(`/tripartite-reviews/reviews/new?learnerId=${learner.id}`);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Next Review Due</h2>

      <div className="space-y-4">
        {/* Last Completed Review */}
        {cycleStatus.lastReviewDate ? (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Last Completed Review</p>
              <p className="text-xs text-gray-500 mt-0.5">Previous review date</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatDate(new Date(cycleStatus.lastReviewDate))}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Last Completed Review</p>
              <p className="text-xs text-gray-500 mt-0.5">No reviews completed yet</p>
            </div>
            <p className="text-sm font-semibold text-gray-400">—</p>
          </div>
        )}

        {/* Reminder Start Date */}
        {cycleStatus.reminderStartDate && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Reminder Start Date</p>
              <p className="text-xs text-gray-500 mt-0.5">Last review + 8 weeks (56 days)</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatDate(new Date(cycleStatus.reminderStartDate))}
            </p>
          </div>
        )}

        {/* Due Date */}
        {cycleStatus.nextDueDate && (
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-900">Due Date</p>
              <p className="text-xs text-gray-500 mt-0.5">Last review + 10 weeks (70 days)</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatDate(new Date(cycleStatus.nextDueDate))}
            </p>
          </div>
        )}

        {/* Days Until Due / Overdue */}
        {cycleStatus.status === 'DUE_SOON' && cycleStatus.daysUntilDue && (
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Days Until Due</p>
              <p className="text-xs text-gray-500 mt-0.5">Time remaining</p>
            </div>
            <div className="flex items-center gap-2">
              <i className="ri-time-line text-amber-600"></i>
              <p className="text-sm font-semibold text-amber-600">
                {cycleStatus.daysUntilDue} days
              </p>
            </div>
          </div>
        )}

        {cycleStatus.status === 'OVERDUE' && cycleStatus.daysOverdue && (
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Days Overdue</p>
              <p className="text-xs text-gray-500 mt-0.5">Requires immediate attention</p>
            </div>
            <div className="flex items-center gap-2">
              <i className="ri-alert-line text-red-600"></i>
              <p className="text-sm font-semibold text-red-600">
                {cycleStatus.daysOverdue} days
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <Button
          onClick={handleScheduleReview}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
        >
          <i className="ri-calendar-line mr-2"></i>
          {cycleStatus.status === 'NOT_STARTED' ? 'Schedule First Review' : 'Schedule Next Review'}
        </Button>
      </div>
    </div>
  );
}

export default NextReviewPanel;
