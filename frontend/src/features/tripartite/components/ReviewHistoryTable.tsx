import { TripartiteReviewSummary } from '../../../shared/types/review';
import { Badge } from '../../../shared/components/Badge';
import Button from '../../../shared/components/Button';
import { formatDate, formatDateTime } from '../../../backend/utils/review-cycle';
import { useNavigate } from 'react-router-dom';

interface ReviewHistoryTableProps {
  reviews: TripartiteReviewSummary[];
}

export function ReviewHistoryTable({ reviews }: ReviewHistoryTableProps) {
  const navigate = useNavigate();

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Review History</h2>
        <div className="flex flex-col items-center justify-center py-12">
          <i className="ri-file-list-3-line text-5xl text-gray-300 mb-4"></i>
          <p className="text-sm text-gray-500 mb-1">No reviews completed yet</p>
          <p className="text-xs text-gray-400">Review history will appear here once completed</p>
        </div>
      </div>
    );
  }

  const getComplianceBadgeClass = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 70) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Review History</h2>
        <p className="text-sm text-gray-500 mt-1">{reviews.length} completed reviews</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Review Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Skills Coach
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Employer
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Compliance
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Sign-off
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reviews.map((review) => (
              <tr key={review.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(new Date(review.reviewDateTime))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(new Date(review.reviewDateTime)).split(', ')[1]}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-gray-900">{review.coach.name}</p>
                    <p className="text-xs text-gray-500">{review.coach.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-gray-900">{review.employer.name}</p>
                    <p className="text-xs text-gray-500">{review.employer.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{review.durationMinutes} mins</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge className={getComplianceBadgeClass(review.complianceScorePercent)}>
                    {review.complianceScorePercent.toFixed(1)}%
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {review.signOffComplete ? (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <i className="ri-checkbox-circle-fill"></i>
                      <span className="text-sm font-medium">Complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <i className="ri-time-line"></i>
                      <span className="text-sm font-medium">Pending</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    onClick={() => navigate(`/tripartite-reviews/reviews/${review.id}`)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
                  >
                    <i className="ri-eye-line mr-1.5"></i>
                    View Report
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ReviewHistoryTable;
