import { Link } from 'react-router-dom';
import { TripartiteReviewSummary } from '../../../shared/types/review';
import Badge from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';

interface RecentReviewsTableProps {
  reviews: TripartiteReviewSummary[];
}

export default function RecentReviewsTable({ reviews }: RecentReviewsTableProps) {
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-gray-50 rounded-full">
          <i className="ri-file-list-3-line text-3xl text-gray-400"></i>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No recent reviews</h3>
        <p className="text-sm text-gray-600">Completed reviews will appear here</p>
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
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Learner
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Employer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Sign-off
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reviews.map((review) => (
              <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatDateTime(review.reviewDateTime)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/tripartite-reviews/learners/${review.learner.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-teal-600 transition-colors"
                  >
                    {review.learner.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{review.coach.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{review.employer.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{review.durationMinutes} mins</td>
                <td className="px-4 py-3">
                  {review.signOffComplete ? (
                    <Badge variant="success">
                      <i className="ri-checkbox-circle-line mr-1"></i>
                      Complete
                    </Badge>
                  ) : (
                    <Badge variant="warning">
                      <i className="ri-time-line mr-1"></i>
                      Pending
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/tripartite-reviews/reviews/${review.id}`}>
                    <Button variant="secondary" size="sm" className="whitespace-nowrap">
                      <i className="ri-eye-line mr-1.5"></i>
                      View
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
