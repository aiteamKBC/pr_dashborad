import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { reviewsApi } from '../api/reviews-api';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Badge from '../../../shared/components/Badge';
import { calculateComplianceScore, calculateRiskFlags, getStatusBadgeColor, formatRiskFlag, getRiskBadgeColor } from '../../../shared/utils/review-calculations';

export default function ReviewDetailsPage() {
  const { reviewId } = useParams<{ reviewId: string }>();
  const navigate = useNavigate();

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => reviewsApi.getReview(reviewId!),
    enabled: !!reviewId,
  });

  const handleExportPDF = () => {
    window.print();
  };

  if (isLoading) return <LoadingSpinner />;
  if (!review) return <div className="p-8 text-center">Review not found</div>;

  const complianceScore = calculateComplianceScore(review.evaluations);
  const riskFlags = calculateRiskFlags(review);
  const signOffComplete = review.signOff.learnerSignedAt && review.signOff.employerSignedAt && review.signOff.coachSignedAt;

  const actionsByOwner = {
    LEARNER: review.actions.filter(a => a.ownerType === 'LEARNER'),
    EMPLOYER: review.actions.filter(a => a.ownerType === 'EMPLOYER'),
    COACH: review.actions.filter(a => a.ownerType === 'COACH'),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/tripartite-reviews')} className="cursor-pointer">
              <i className="ri-arrow-left-line text-2xl text-gray-600 hover:text-gray-900"></i>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Review Report</h1>
              <p className="text-sm text-gray-600">ID: {review.id}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExportPDF}>
              <i className="ri-file-pdf-line mr-2"></i>
              Export to PDF
            </Button>
            <Button onClick={() => navigate(`/tripartite-reviews/reviews/${reviewId}/edit`)}>
              <i className="ri-edit-line mr-2"></i>
              Edit Review
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tripartite Progress Review Report</h1>
          <p className="text-sm text-gray-600">Review ID: {review.id}</p>
          <p className="text-sm text-gray-600">Generated: {format(new Date(), 'dd MMM yyyy HH:mm')}</p>
        </div>

        {/* Review Metadata Card */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Review Metadata</h2>
              <p className="text-sm text-gray-600">Completed on {format(new Date(review.reviewDateTime), 'dd MMMM yyyy')}</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Compliance Score</p>
                <Badge variant={complianceScore >= 80 ? 'success' : complianceScore >= 60 ? 'warning' : 'danger'} className="text-base px-3 py-1">
                  {complianceScore}%
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Sign-off Status</p>
                <Badge variant={signOffComplete ? 'success' : 'warning'}>
                  {signOffComplete ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            </div>
          </div>

          {riskFlags.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-900 mb-2">
                <i className="ri-alert-line mr-1"></i>
                Risk Flags Identified
              </p>
              <div className="flex flex-wrap gap-2">
                {riskFlags.map(flag => (
                  <Badge key={flag} className={getRiskBadgeColor(flag)}>
                    {formatRiskFlag(flag)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Programme</p>
              <p className="text-sm font-medium text-gray-900">{review.programme}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Group</p>
              <p className="text-sm font-medium text-gray-900">{review.group}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Review Date & Time</p>
              <p className="text-sm font-medium text-gray-900">{format(new Date(review.reviewDateTime), 'dd MMM yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-sm font-medium text-gray-900">{review.durationMinutes} minutes</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">OTJ Hours Reviewed</p>
              <p className="text-sm font-medium text-gray-900">{review.otjHoursReviewed} hours</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">OTJ Hours Value</p>
              <p className="text-sm font-medium text-gray-900">{review.otjHoursValue} hours</p>
            </div>
          </div>
        </Card>

        {/* Participants Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <i className="ri-user-line text-white text-lg"></i>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-900">Learner</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{review.learner.name}</p>
              <p className="text-xs text-gray-600">{review.learner.email}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                  <i className="ri-briefcase-line text-white text-lg"></i>
                </div>
                <div>
                  <p className="text-xs font-medium text-green-900">Employer / Line Manager</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{review.employer.name}</p>
              <p className="text-xs text-gray-600">{review.employer.email}</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                  <i className="ri-user-star-line text-white text-lg"></i>
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-900">Skills Coach</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{review.coach.name}</p>
              <p className="text-xs text-gray-600">{review.coach.email}</p>
            </div>
          </div>
        </Card>

        {/* QA Checklist Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">QA Checklist (13 Criteria)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 w-12">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Criterion</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 w-24">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {review.evaluations.map((evaluation, index) => (
                  <tr key={evaluation.criterionCode} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{evaluation.criterionTitle}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadgeColor(evaluation.status)}>
                        {evaluation.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{evaluation.comment || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Narrative Assessment */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Narrative Assessment</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-thumb-up-line text-green-600 text-lg"></i>
                <h3 className="text-sm font-semibold text-green-900">Strengths</h3>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{review.strengths}</p>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-lightbulb-line text-amber-600 text-lg"></i>
                <h3 className="text-sm font-semibold text-amber-900">Areas for Development</h3>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{review.areasForDevelopment}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <i className="ri-file-text-line text-blue-600 text-lg"></i>
                <h3 className="text-sm font-semibold text-blue-900">Overall Professional Judgement</h3>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{review.overallJudgement}</p>
            </div>
          </div>
        </Card>

        {/* SMART Actions */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">SMART Actions</h2>
          {Object.entries(actionsByOwner).map(([owner, actions]) => (
            <div key={owner} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  owner === 'LEARNER' ? 'bg-blue-100' : owner === 'EMPLOYER' ? 'bg-green-100' : 'bg-purple-100'
                }`}>
                  <i className={`${
                    owner === 'LEARNER' ? 'ri-user-line text-blue-600' : 
                    owner === 'EMPLOYER' ? 'ri-briefcase-line text-green-600' : 
                    'ri-user-star-line text-purple-600'
                  } text-sm`}></i>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{owner}</h3>
                <span className="text-xs text-gray-500">({actions.length} {actions.length === 1 ? 'action' : 'actions'})</span>
              </div>
              {actions.length === 0 ? (
                <p className="text-sm text-gray-400 ml-10">No actions assigned</p>
              ) : (
                <div className="space-y-3 ml-10">
                  {actions.map((action) => (
                    <div key={action.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-gray-900 flex-1 font-medium">{action.actionText}</p>
                        <Badge variant={action.status === 'DONE' ? 'success' : action.status === 'IN_PROGRESS' ? 'warning' : 'default'}>
                          {action.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {action.linkedKsb && (
                          <span className="flex items-center gap-1">
                            <i className="ri-bookmark-line"></i>
                            KSB: {action.linkedKsb}
                          </span>
                        )}
                        {action.linkedNextStep && (
                          <span className="flex items-center gap-1">
                            <i className="ri-arrow-right-line"></i>
                            Next Step: {action.linkedNextStep}
                          </span>
                        )}
                        {action.dueDate && (
                          <span className="flex items-center gap-1">
                            <i className="ri-calendar-line"></i>
                            Due: {format(new Date(action.dueDate), 'dd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Card>

        {/* Sign-off Confirmation Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign-off Confirmation</h2>
          <p className="text-sm text-gray-600 mb-4">All three parties must sign off to complete the review.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-user-line text-blue-600"></i>
                <p className="text-sm font-medium text-gray-900">Learner</p>
              </div>
              {review.signOff.learnerSignedAt ? (
                <>
                  <Badge variant="success" className="mb-2">
                    <i className="ri-checkbox-circle-line mr-1"></i>
                    Signed
                  </Badge>
                  <p className="text-xs text-gray-600">
                    <i className="ri-time-line mr-1"></i>
                    {format(new Date(review.signOff.learnerSignedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </>
              ) : (
                <Badge variant="warning">
                  <i className="ri-time-line mr-1"></i>
                  Pending
                </Badge>
              )}
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-briefcase-line text-green-600"></i>
                <p className="text-sm font-medium text-gray-900">Employer</p>
              </div>
              {review.signOff.employerSignedAt ? (
                <>
                  <Badge variant="success" className="mb-2">
                    <i className="ri-checkbox-circle-line mr-1"></i>
                    Signed
                  </Badge>
                  <p className="text-xs text-gray-600">
                    <i className="ri-time-line mr-1"></i>
                    {format(new Date(review.signOff.employerSignedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </>
              ) : (
                <Badge variant="warning">
                  <i className="ri-time-line mr-1"></i>
                  Pending
                </Badge>
              )}
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-user-star-line text-purple-600"></i>
                <p className="text-sm font-medium text-gray-900">Skills Coach</p>
              </div>
              {review.signOff.coachSignedAt ? (
                <>
                  <Badge variant="success" className="mb-2">
                    <i className="ri-checkbox-circle-line mr-1"></i>
                    Signed
                  </Badge>
                  <p className="text-xs text-gray-600">
                    <i className="ri-time-line mr-1"></i>
                    {format(new Date(review.signOff.coachSignedAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </>
              ) : (
                <Badge variant="warning">
                  <i className="ri-time-line mr-1"></i>
                  Pending
                </Badge>
              )}
            </div>
          </div>

          {signOffComplete && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
              <i className="ri-checkbox-circle-fill text-green-600 text-lg"></i>
              <p className="text-sm font-medium text-green-900">Review fully signed off and completed</p>
            </div>
          )}
        </Card>

        {/* Footer Metadata */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Review created: {format(new Date(review.createdAt), 'dd MMM yyyy HH:mm')}</p>
          <p>Last updated: {format(new Date(review.updatedAt), 'dd MMM yyyy HH:mm')}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
}