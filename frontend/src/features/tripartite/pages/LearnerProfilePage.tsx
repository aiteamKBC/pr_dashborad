import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLearnerById, getLearnerReviews } from '../api/learners-api';
import { LoadingSpinner } from '../../../shared/components/LoadingSpinner';
import { Button } from '../../../shared/components/Button';
import { LearnerHeader } from '../components/LearnerHeader';
import { StatusTimeline } from '../components/StatusTimeline';
import { NextReviewPanel } from '../components/NextReviewPanel';
import { ReviewHistoryTable } from '../components/ReviewHistoryTable';

export function LearnerProfilePage() {
  const { learnerId } = useParams<{ learnerId: string }>();
  const navigate = useNavigate();

  const {
    data: learner,
    isLoading: isLoadingLearner,
    error: learnerError,
    refetch: refetchLearner,
  } = useQuery({
    queryKey: ['learner', learnerId],
    queryFn: () => getLearnerById(learnerId!),
    enabled: !!learnerId,
  });

  const {
    data: reviews,
    isLoading: isLoadingReviews,
    error: reviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ['learner-reviews', learnerId],
    queryFn: () => getLearnerReviews(learnerId!),
    enabled: !!learnerId,
  });

  const isLoading = isLoadingLearner || isLoadingReviews;
  const error = learnerError || reviewsError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !learner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Learner</h2>
        <p className="text-sm text-gray-500 mb-6">
          {error instanceof Error ? error.message : 'Unable to load learner details'}
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              refetchLearner();
              refetchReviews();
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white whitespace-nowrap"
          >
            <i className="ri-refresh-line mr-2"></i>
            Try Again
          </Button>
          <Button
            onClick={() => navigate('/tripartite-reviews/learners')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-2"></i>
            Back to Learners
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/tripartite-reviews/learners')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 whitespace-nowrap"
              >
                <i className="ri-arrow-left-line mr-2"></i>
                Back to Learners
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">Learner Profile</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Learner Header Card */}
          <LearnerHeader learner={learner} />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Timeline and History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Timeline */}
              <StatusTimeline learner={learner} />

              {/* Review History */}
              <ReviewHistoryTable reviews={reviews || []} />
            </div>

            {/* Right Column - Next Review Panel */}
            <div className="lg:col-span-1">
              <NextReviewPanel learner={learner} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}