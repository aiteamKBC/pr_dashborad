import { Link } from 'react-router-dom';
import { LearnerWithStatus } from '../../../shared/types/learner';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';

interface OverduePanelProps {
  learners: LearnerWithStatus[];
}

export default function OverduePanel({ learners }: OverduePanelProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (learners.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-green-50 rounded-full">
          <i className="ri-checkbox-circle-line text-3xl text-green-600"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No overdue reviews</h3>
        <p className="text-sm text-gray-600">All reviews are on track</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-red-50 border-b border-red-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-900 uppercase tracking-wider">
                Learner
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-900 uppercase tracking-wider">
                Programme
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-900 uppercase tracking-wider">
                Group
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-900 uppercase tracking-wider">
                Last Review
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-900 uppercase tracking-wider">
                Was Due
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-red-900 uppercase tracking-wider">
                Days Overdue
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-red-900 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {learners.map((learner) => (
              <tr key={learner.id} className="hover:bg-red-50 transition-colors">
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
                  <div className="flex items-center gap-2">
                    <i className="ri-alert-line text-red-600"></i>
                    <span className="text-sm font-semibold text-red-600">
                      {learner.cycleStatus.daysOverdue} days
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/tripartite-reviews/reviews/new?learnerId=${learner.id}`}>
                    <Button size="sm" className="whitespace-nowrap bg-red-600 hover:bg-red-700">
                      <i className="ri-calendar-line mr-1.5"></i>
                      Complete Now
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
