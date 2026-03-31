import { Link } from 'react-router-dom';
import { LearnerWithStatus } from '../../../shared/types/learner';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';

interface DueSoonPanelProps {
  learners: LearnerWithStatus[];
}

export default function DueSoonPanel({ learners }: DueSoonPanelProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusVariant = (status: string): 'error' | 'warning' | 'success' | 'default' => {
    switch (status) {
      case 'OVERDUE': return 'error';
      case 'DUE_SOON': return 'warning';
      case 'COMPLETED': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OVERDUE': return 'Overdue';
      case 'DUE_SOON': return 'Due Soon';
      case 'COMPLETED': return 'Completed';
      case 'NOT_STARTED': return 'Not Started';
      default: return status;
    }
  };

  if (learners.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-green-50 rounded-full">
          <i className="ri-checkbox-circle-line text-3xl text-green-600"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
        <p className="text-sm text-gray-600">No reviews due in the next 14 days</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Learner
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Programme
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Review
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Next Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Days Until Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {learners.map((learner) => (
              <tr key={learner.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    to={`/tripartite-reviews/learners/${learner.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-teal-600 transition-colors"
                  >
                    {learner.name}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">{learner.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{learner.programme}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{learner.group}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDate(learner.cycleStatus.lastCompletedReviewDate)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDate(learner.cycleStatus.nextDueDate)}
                </td>
                <td className="px-4 py-3">
                  {learner.cycleStatus.daysUntilDue !== null ? (
                    <span className={`text-sm font-medium ${
                      learner.cycleStatus.daysUntilDue <= 7 ? 'text-amber-600' : 'text-gray-700'
                    }`}>
                      {learner.cycleStatus.daysUntilDue} days
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">N/A</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusVariant(learner.cycleStatus.status)}>
                    {getStatusLabel(learner.cycleStatus.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/tripartite-reviews/reviews/new?learnerId=${learner.id}`}>
                    <Button size="sm" className="whitespace-nowrap">
                      <i className="ri-calendar-line mr-1.5"></i>
                      Schedule
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
