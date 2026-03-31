
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ReviewFormData } from '../types/review-form';
import {
  Step1Participants,
  Step2Evidence,
  Step3Checklist,
  Step4Actions,
} from '../components/ReviewFormSteps';
import { useToast } from '../../../shared/hooks/useToast';

const reviewFormSchema = z.object({
  learner: z.object({
    name: z.string().min(1, 'Learner name is required'),
    email: z.string().email('Valid email is required'),
  }),
  coach: z.object({
    name: z.string().min(1, 'Coach name is required'),
    email: z.string().email('Valid email is required'),
  }),
  employer: z.object({
    name: z.string().min(1, 'Employer name is required'),
    email: z.string().email('Valid email is required'),
  }),
  meetingDate: z.string().min(1, 'Meeting date is required'),
  meetingTime: z.string().min(1, 'Meeting time is required'),
  meetingType: z.enum(['teams', 'in-person', 'phone', 'zoom']),
  location: z.string(),
  durationMinutes: z.number().min(1, 'Duration must be at least 1 minute'),
  programme: z.string(),
  group: z.string(),
  progressNotes: z.string().min(10, 'Progress notes are required (minimum 10 characters)'),
  otjHoursSinceLastReview: z.number().min(0),
  otjHoursTotal: z.number().min(0),
  otjEvidence: z.string(),
  learnerLearningNotes: z.string(),
  employerFeedbackNotes: z.string(),
  safeguarding: z.object({
    completed: z.boolean(),
    notes: z.string(),
  }),
  supportNeeds: z.object({
    identified: z.boolean(),
    riskSummary: z.string(),
    mitigationActions: z.string(),
  }),
  checklist: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      status: z.enum(['YES', 'PARTIAL', 'NO', '']),
      comment: z.string(),
    })
  ),
  strengths: z.string(),
  areasForDevelopment: z.string(),
  overallJudgement: z.string(),
  actions: z.array(
    z.object({
      id: z.string(),
      owner: z.enum(['LEARNER', 'EMPLOYER', 'COACH']),
      actionText: z.string(),
      dueDate: z.string().nullable(),
      linkedGap: z.string().nullable(),
      status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']),
    })
  ),
  signOff: z.object({
    learnerSignedAt: z.string().nullable(),
    employerSignedAt: z.string().nullable(),
    coachSignedAt: z.string().nullable(),
  }),
});

const SECTIONS = [
  { id: 'participants', label: 'Participants & Meeting', icon: 'ri-team-line' },
  { id: 'evidence', label: 'Evidence & Notes', icon: 'ri-file-text-line' },
  { id: 'checklist', label: 'QA Checklist', icon: 'ri-checkbox-multiple-line' },
  { id: 'actions', label: 'Actions & Sign Off', icon: 'ri-task-line' },
];

export default function CreateReviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      learner: { name: '', email: '' },
      coach: { name: '', email: '' },
      employer: { name: '', email: '' },
      meetingDate: '',
      meetingTime: '',
      meetingType: 'teams',
      location: '',
      durationMinutes: 60,
      programme: '',
      group: '',
      progressNotes: '',
      otjHoursSinceLastReview: 0,
      otjHoursTotal: 0,
      otjEvidence: '',
      learnerLearningNotes: '',
      employerFeedbackNotes: '',
      safeguarding: { completed: false, notes: '' },
      supportNeeds: { identified: false, riskSummary: '', mitigationActions: '' },
      checklist: Array(13).fill({ code: '', title: '', status: '', comment: '' }),
      strengths: '',
      areasForDevelopment: '',
      overallJudgement: '',
      actions: [],
      signOff: {
        learnerSignedAt: null,
        employerSignedAt: null,
        coachSignedAt: null,
      },
    },
  });

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const formData = form.getValues();
      localStorage.setItem('review-draft', JSON.stringify(formData));
      showToast('Draft saved successfully', 'success');
    } catch {
      showToast('Failed to save draft', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const validateCompletion = (data: ReviewFormData): string[] => {
    const errors: string[] = [];
    if (!data.meetingDate) errors.push('Meeting date is required');
    if (!data.meetingTime) errors.push('Meeting time is required');
    if (data.durationMinutes < 1) errors.push('Duration must be set');
    if (!data.progressNotes || data.progressNotes.length < 10)
      errors.push('Progress discussion notes are required');
    const allChecklistFilled = data.checklist.every((item) => item.status !== '');
    if (!allChecklistFilled)
      errors.push('All 13 QA checklist criteria must be evaluated');
    if (!data.signOff.learnerSignedAt || !data.signOff.employerSignedAt || !data.signOff.coachSignedAt)
      errors.push('All three parties must sign off the review');
    return errors;
  };

  const onSubmit = async (data: ReviewFormData) => {
    const validationErrors = validateCompletion(data);
    if (validationErrors.length > 0) {
      showToast(`Cannot complete review: ${validationErrors[0]}`, 'error');
      return;
    }
    setIsSaving(true);
    try {
      console.log('Submitting review:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      localStorage.removeItem('review-draft');
      showToast('Review created successfully', 'success');
      navigate('/tripartite-reviews');
    } catch {
      showToast('Failed to create review', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <i className="ri-arrow-left-line"></i>
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="h-5 w-px bg-gray-300"></div>
              <h1 className="text-lg font-semibold text-gray-900">
                Create Tripartite Progress Review
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                <i className="ri-save-line mr-1"></i>
                Save Draft
              </button>
              <button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {isSaving ? (
                  <><i className="ri-loader-4-line animate-spin"></i> Saving...</>
                ) : (
                  <><i className="ri-check-line"></i> Complete Review</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sticky sidebar nav */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sections</p>
              </div>
              <nav className="p-2 space-y-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer text-left"
                  >
                    <i className={`${section.icon} text-base`}></i>
                    <span>{section.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main form */}
          <div className="flex-1 min-w-0">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* Section 1 */}
              <div id="participants" className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                  <div className="w-8 h-8 flex items-center justify-center bg-teal-100 rounded-full">
                    <i className="ri-team-line text-teal-700 text-sm"></i>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Participants &amp; Meeting</h2>
                </div>
                <div className="p-6">
                  <Step1Participants form={form} />
                </div>
              </div>

              {/* Section 2 */}
              <div id="evidence" className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                  <div className="w-8 h-8 flex items-center justify-center bg-teal-100 rounded-full">
                    <i className="ri-file-text-line text-teal-700 text-sm"></i>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">Evidence &amp; Notes</h2>
                </div>
                <div className="p-6">
                  <Step2Evidence form={form} />
                </div>
              </div>

              {/* Section 3 */}
              <div id="checklist" className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                  <div className="w-8 h-8 flex items-center justify-center bg-teal-100 rounded-full">
                    <i className="ri-checkbox-multiple-line text-teal-700 text-sm"></i>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">QA Checklist</h2>
                </div>
                <div className="p-6">
                  <Step3Checklist form={form} />
                </div>
              </div>

              {/* Section 4 */}
              <div id="actions" className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                  <div className="w-8 h-8 flex items-center justify-center bg-teal-100 rounded-full">
                    <i className="ri-task-line text-teal-700 text-sm"></i>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">SMART Actions &amp; Sign Off</h2>
                </div>
                <div className="p-6">
                  <Step4Actions form={form} />
                </div>
              </div>

              {/* Bottom submit bar */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-save-line mr-1"></i>
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {isSaving ? (
                    <><i className="ri-loader-4-line animate-spin"></i> Creating...</>
                  ) : (
                    <><i className="ri-check-line"></i> Complete Review</>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
