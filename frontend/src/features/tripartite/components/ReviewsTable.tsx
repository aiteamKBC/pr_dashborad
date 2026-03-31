import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Badge from '../../../shared/components/Badge';
import { TripartiteReviewSummary } from '../../../shared/types/review';
import { formatRiskFlag, getRiskBadgeColor } from '../../../shared/utils/review-calculations';

interface ReviewsTableProps {
  reviews: TripartiteReviewSummary[];
}

export default function ReviewsTable({ reviews }: ReviewsTableProps) {
  const navigate = useNavigate();

  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thCls}>Review Date</th>
              <th className={thCls}>Learner</th>
              <th className={thCls}>Employer</th>
              <th className={thCls}>Coach</th>
              <th className={thCls}>Programme</th>
              <th className={thCls}>Compliance</th>
              <th className={thCls}>Risk Flags</th>
              <th className={thCls}>Sign-off</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <tr
                key={review.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/tripartite-reviews/${review.id}`)}
              >
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                  {format(new Date(review.reviewDateTime), 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{review.learner.name}</div>
                  <div className="text-xs text-gray-500">{review.learner.email}</div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">{review.employer.name}</td>
                <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">{review.coach.name}</td>
                <td className="px-4 py-3.5 text-sm text-gray-700">
                  <div className="max-w-[180px] truncate">{review.programme}</div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Badge variant={review.complianceScorePercent >= 80 ? 'success' : review.complianceScorePercent >= 60 ? 'warning' : 'danger'}>
                    {review.complianceScorePercent}%
                  </Badge>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {review.riskFlags.length === 0 ? (
                      <span className="text-xs text-gray-400">None</span>
                    ) : (
                      review.riskFlags.slice(0, 2).map((flag) => (
                        <Badge key={flag} className={getRiskBadgeColor(flag)}>
                          {formatRiskFlag(flag)}
                        </Badge>
                      ))
                    )}
                    {review.riskFlags.length > 2 && (
                      <Badge className="bg-gray-100 text-gray-600">+{review.riskFlags.length - 2}</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <Badge variant={review.signOffComplete ? 'success' : 'warning'}>
                    {review.signOffComplete ? 'Complete' : 'Pending'}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/tripartite-reviews/${review.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 px-2.5 py-1.5 rounded-md hover:bg-teal-50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    View
                    <i className="ri-arrow-right-line"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}