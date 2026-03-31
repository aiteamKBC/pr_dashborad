
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewsApi } from '../api/reviews-api';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { useToast } from '../../../shared/hooks/useToast';
import ActionModal from '../components/ActionModal';

const reviewSchema = z.object({
  programme: z.string().min(1, 'Programme is required'),
  group: z.string().min(1, 'Group is required'),
  learnerName: z.string().min(1, 'Learner name is required'),
  learnerEmail: z.string().email('Invalid email'),
  employerName: z.string().min(1, 'Employer name is required'),
  employerEmail: z.string().email('Invalid email'),
  coachName: z.string().min(1, 'Coach name is required'),
  coachEmail: z.string().email('Invalid email'),
  reviewDateTime: z.string().min(1, 'Review date is required'),
  dueDateTime: z.string().min(1, 'Due date is required'),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  otjHoursReviewed: z.number().min(0),
  otjHoursValue: z.number().min(0),
  strengths: z.string().min(10, 'Please provide detailed strengths'),
  areasForDevelopment: z.string().min(10, 'Please provide detailed areas for development'),
  overallJudgement: z.string().min(10, 'Please provide detailed overall judgement'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

export default function EditReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [signOff, setSignOff] = useState<any>();
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', id],
    queryFn: () => reviewsApi.getReview(id!),
    enabled: !!id,
  });

  // Sync review data into local state when it loads (replaces removed onSuccess)
  useEffect(() => {
    if (review) {
      setEvaluations(review.evaluations);
      setActions(review.actions);
      setSignOff(review.signOff);
    }
  }, [review]);

  const { register, handleSubmit, formState: { errors } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    values: review ? {
      programme: review.programme,
      group: review.group,
      learnerName: review.learner.name,
      learnerEmail: review.learner.email,
      employerName: review.employer.name,
      employerEmail: review.employer.email,
      coachName: review.coach.name,
      coachEmail: review.coach.email,
      reviewDateTime: review.reviewDateTime.slice(0, 16),
      dueDateTime: review.dueDateTime.slice(0, 16),
      durationMinutes: review.durationMinutes,
      otjHoursReviewed: review.otjHoursReviewed,
      otjHoursValue: review.otjHoursValue,
      strengths: review.strengths,
      areasForDevelopment: review.areasForDevelopment,
      overallJudgement: review.overallJudgement,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      await reviewsApi.updateReview(id!, {
        programme: data.programme,
        group: data.group,
        learner: { id: review!.learner.id, name: data.learnerName, email: data.learnerEmail },
        employer: { name: data.employerName, email: data.employerEmail },
        coach: { id: review!.coach.id, name: data.coachName, email: data.coachEmail },
        reviewDateTime: new Date(data.reviewDateTime).toISOString(),
        dueDateTime: new Date(data.dueDateTime).toISOString(),
        durationMinutes: data.durationMinutes,
        otjHoursReviewed: data.otjHoursReviewed,
        otjHoursValue: data.otjHoursValue,
        strengths: data.strengths,
        areasForDevelopment: data.areasForDevelopment,
        overallJudgement: data.overallJudgement,
      });
      await reviewsApi.updateEvaluations(id!, evaluations);
      await reviewsApi.signOff(id!, signOff);
    },
    onSuccess: () => {
      showToast('Review updated successfully', 'success');
      setTimeout(() => navigate(`/tripartite-reviews/reviews/${id}`), 1500);
    },
    onError: () => {
      showToast('Failed to update review', 'error');
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) => reviewsApi.deleteAction(actionId),
    onSuccess: () => {
      showToast('Action deleted successfully', 'success');
      setActions(prev => prev.filter(a => a.id !== editingAction?.id));
      setEditingAction(null);
    },
    onError: () => {
      showToast('Failed to delete action', 'error');
    },
  });

  const handleEvaluationChange = (criterionCode: string, field: string, value: any) => {
    setEvaluations(prev =>
      prev.map(e => e.criterionCode === criterionCode ? { ...e, [field]: value } : e)
    );
  };

  const handleSignOff = (party: 'learner' | 'employer' | 'coach') => {
    const key = `${party}SignedAt`;
    setSignOff((prev: any) => ({
      ...prev,
      [key]: prev[key] ? null : new Date().toISOString(),
    }));
  };

  const handleSaveAction = async (action: any) => {
    if (editingAction) {
      await reviewsApi.updateAction(editingAction.id, action);
      setActions(prev => prev.map(a => a.id === editingAction.id ? { ...a, ...action } : a));
      showToast('Action updated successfully', 'success');
    } else {
      const newAction = await reviewsApi.createAction(id!, action);
      setActions(prev => [...prev, newAction]);
      showToast('Action created successfully', 'success');
    }
    setShowActionModal(false);
    setEditingAction(null);
  };

  const handleDeleteAction = () => {
    if (editingAction && window.confirm('Are you sure you want to delete this action?')) {
      deleteActionMutation.mutate(editingAction.id);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (!review) return <div className="p-8 text-center">Review not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/tripartite-reviews/reviews/${id}`)} className="cursor-pointer">
              <i className="ri-arrow-left-line text-2xl text-gray-600 hover:text-gray-900"></i>
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Edit Review</h1>
              <p className="text-sm text-gray-600">ID: {review.id}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Programme</label>
                <input {...register('programme')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {errors.programme && <p className="text-xs text-red-600 mt-1">{errors.programme.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <input {...register('group')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {errors.group && <p className="text-xs text-red-600 mt-1">{errors.group.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Date & Time</label>
                <input type="datetime-local" {...register('reviewDateTime')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {errors.reviewDateTime && <p className="text-xs text-red-600 mt-1">{errors.reviewDateTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time</label>
                <input type="datetime-local" {...register('dueDateTime')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {errors.dueDateTime && <p className="text-xs text-red-600 mt-1">{errors.dueDateTime.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input type="number" {...register('durationMinutes', { valueAsNumber: true })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {errors.durationMinutes && <p className="text-xs text-red-600 mt-1">{errors.durationMinutes.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTJ Hours Reviewed</label>
                <input type="number" {...register('otjHoursReviewed', { valueAsNumber: true })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTJ Hours Value</label>
                <input type="number" {...register('otjHoursValue', { valueAsNumber: true })} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(['learner', 'employer', 'coach'] as const).map((party) => (
                <div key={party}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">{party}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Name</label>
                      <input {...register(`${party}Name` as any)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Email</label>
                      <input {...register(`${party}Email` as any)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Criteria Evaluation</h2>
            <div className="space-y-4">
              {evaluations.map((evaluation) => (
                <div key={evaluation.criterionCode} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 mb-2">{evaluation.criterionTitle}</p>
                      <textarea
                        value={evaluation.comment}
                        onChange={(e) => handleEvaluationChange(evaluation.criterionCode, 'comment', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        rows={2}
                        placeholder="Add comment..."
                      />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(['YES', 'PARTIAL', 'NO'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleEvaluationChange(evaluation.criterionCode, 'status', status)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
                            evaluation.status === status
                              ? status === 'YES' ? 'bg-green-600 text-white'
                                : status === 'PARTIAL' ? 'bg-amber-600 text-white'
                                : 'bg-red-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Narrative</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
                <textarea {...register('strengths')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" rows={4} />
                {errors.strengths && <p className="text-xs text-red-600 mt-1">{errors.strengths.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Areas for Development</label>
                <textarea {...register('areasForDevelopment')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" rows={4} />
                {errors.areasForDevelopment && <p className="text-xs text-red-600 mt-1">{errors.areasForDevelopment.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Judgement</label>
                <textarea {...register('overallJudgement')} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" rows={4} />
                {errors.overallJudgement && <p className="text-xs text-red-600 mt-1">{errors.overallJudgement.message}</p>}
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">SMART Actions</h2>
              <Button type="button" size="sm" onClick={() => { setEditingAction(null); setShowActionModal(true); }}>
                <i className="ri-add-line mr-2"></i>Add Action
              </Button>
            </div>
            <div className="space-y-3">
              {actions.map((action) => (
                <div key={action.id} className="bg-gray-50 rounded-lg p-4 flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 mb-1">{action.actionText}</p>
                    <div className="flex gap-3 text-xs text-gray-500">
                      <span>Owner: {action.ownerType}</span>
                      {action.dueDate && <span>Due: {action.dueDate}</span>}
                      <span>Status: {action.status}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setEditingAction(action); setShowActionModal(true); }} className="text-teal-600 hover:text-teal-700 text-sm cursor-pointer whitespace-nowrap ml-4">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sign-off</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['learner', 'employer', 'coach'] as const).map((party) => {
                const key = `${party}SignedAt`;
                const isSigned = signOff[key];
                return (
                  <div key={party} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 capitalize">{party}</p>
                    <Button type="button" size="sm" variant={isSigned ? 'secondary' : 'primary'} onClick={() => handleSignOff(party)}>
                      {isSigned ? 'Remove Sign-off' : 'Mark Signed Now'}
                    </Button>
                    {isSigned && <p className="text-xs text-gray-500 mt-2">Signed: {new Date(isSigned).toLocaleString('en-GB')}</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate(`/tripartite-reviews/reviews/${id}`)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>

      {showActionModal && (
        <ActionModal
          action={editingAction}
          onSave={handleSaveAction}
          onDelete={editingAction ? handleDeleteAction : undefined}
          onClose={() => { setShowActionModal(false); setEditingAction(null); }}
        />
      )}
    </div>
  );
}