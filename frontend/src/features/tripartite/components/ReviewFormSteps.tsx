import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ReviewFormData } from '../types/review-form';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : isCompleted
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <i className="ri-check-line text-lg"></i>
                  ) : (
                    stepNumber
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    isActive ? 'text-teal-700' : 'text-gray-500'
                  }`}
                >
                  {step}
                </span>
              </div>
              {stepNumber < totalSteps && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    isCompleted ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Step1ParticipantsProps {
  form: UseFormReturn<ReviewFormData>;
}

export function Step1Participants({ form }: Step1ParticipantsProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Participants
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Learner Name
            </label>
            <input
              type="text"
              {...register('learner.name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.learner?.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.learner.name.message}
              </p>
            )}
            <label className="block text-sm font-medium text-gray-700 mt-3 mb-2">
              Learner Email
            </label>
            <input
              type="email"
              {...register('learner.email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.learner?.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.learner.email.message}
              </p>
            )}
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills Coach Name
            </label>
            <input
              type="text"
              {...register('coach.name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.coach?.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.coach.name.message}
              </p>
            )}
            <label className="block text-sm font-medium text-gray-700 mt-3 mb-2">
              Coach Email
            </label>
            <input
              type="email"
              {...register('coach.email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.coach?.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.coach.email.message}
              </p>
            )}
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employer / Line Manager Name
            </label>
            <input
              type="text"
              {...register('employer.name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.employer?.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.employer.name.message}
              </p>
            )}
            <label className="block text-sm font-medium text-gray-700 mt-3 mb-2">
              Employer Email
            </label>
            <input
              type="email"
              {...register('employer.email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.employer?.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.employer.email.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Meeting Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Date
            </label>
            <input
              type="date"
              {...register('meetingDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.meetingDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.meetingDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Time
            </label>
            <input
              type="time"
              {...register('meetingTime')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.meetingTime && (
              <p className="mt-1 text-sm text-red-600">
                {errors.meetingTime.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Type
            </label>
            <select
              {...register('meetingType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="teams">Microsoft Teams</option>
              <option value="in-person">In Person</option>
              <option value="phone">Phone</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Duration (minutes)
            </label>
            <input
              type="number"
              {...register('durationMinutes', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {errors.durationMinutes && (
              <p className="mt-1 text-sm text-red-600">
                {errors.durationMinutes.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location / Teams Join URL
            </label>
            <input
              type="text"
              {...register('location')}
              placeholder="Enter physical location or meeting link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Programme Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Programme
            </label>
            <input
              type="text"
              {...register('programme')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group
            </label>
            <input
              type="text"
              {...register('group')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step2EvidenceProps {
  form: UseFormReturn<ReviewFormData>;
}

export function Step2Evidence({ form }: Step2EvidenceProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const safeguardingCompleted = watch('safeguarding.completed');
  const supportNeedsIdentified = watch('supportNeeds.identified');

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Progress Discussion Notes vs KSBs
        </label>
        <textarea
          {...register('progressNotes')}
          rows={6}
          placeholder="Document the discussion about progress against the apprenticeship standard and KSBs..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {errors.progressNotes && (
          <p className="mt-1 text-sm text-red-600">
            {errors.progressNotes.message}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Off-the-Job Training Hours
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OTJ Hours Since Last Review
            </label>
            <input
              type="number"
              step="0.5"
              {...register('otjHoursSinceLastReview', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total OTJ Hours to Date
            </label>
            <input
              type="number"
              step="0.5"
              {...register('otjHoursTotal', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidence or Notes
            </label>
            <textarea
              {...register('otjEvidence')}
              rows={3}
              placeholder="Document evidence of OTJ training activities..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Learner Learning and Application Notes
        </label>
        <textarea
          {...register('learnerLearningNotes')}
          rows={5}
          placeholder="Document how the learner explains what they have learned and how they have applied it at work..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employer Feedback Notes
        </label>
        <textarea
          {...register('employerFeedbackNotes')}
          rows={5}
          placeholder="Document meaningful feedback from the employer on workplace performance..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Safeguarding and Wellbeing Check
        </h3>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            {...register('safeguarding.completed')}
            id="safeguarding-completed"
            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="safeguarding-completed"
            className="ml-2 text-sm font-medium text-gray-700"
          >
            Safeguarding and wellbeing check completed
          </label>
        </div>
        {safeguardingCompleted && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Safeguarding Notes
            </label>
            <textarea
              {...register('safeguarding.notes')}
              rows={4}
              placeholder="Document any safeguarding or wellbeing concerns, actions taken..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Support Needs or Risks
        </h3>
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            {...register('supportNeeds.identified')}
            id="support-needs-identified"
            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <label
            htmlFor="support-needs-identified"
            className="ml-2 text-sm font-medium text-gray-700"
          >
            Support needs or risks identified
          </label>
        </div>
        {supportNeedsIdentified && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Summary
              </label>
              <textarea
                {...register('supportNeeds.riskSummary')}
                rows={3}
                placeholder="Describe the identified risks or support needs..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mitigation Actions
              </label>
              <textarea
                {...register('supportNeeds.mitigationActions')}
                rows={3}
                placeholder="Document actions taken or planned to mitigate risks..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Step3ChecklistProps {
  form: UseFormReturn<ReviewFormData>;
}

const QA_CRITERIA = [
  {
    code: 'TIMEFRAME',
    title: 'Review held within required timeframe',
    category: 'Compliance',
  },
  {
    code: 'DURATION',
    title: 'Duration (expected 1 hour)',
    category: 'Compliance',
  },
  {
    code: 'ATTENDANCE',
    title: 'Attendance (learner, employer, and skill coach all attended)',
    category: 'Compliance',
  },
  {
    code: 'KSB_PROGRESS',
    title: 'Progress clearly discussed against the apprenticeship standard / KSBs',
    category: 'Quality',
  },
  {
    code: 'OTJ_REVIEW',
    title: 'Off-the-job training hours reviewed and accurately recorded',
    category: 'Quality',
  },
  {
    code: 'LEARNER_APPLICATION',
    title: 'Learner can explain what they have learned and applied at work',
    category: 'Quality',
  },
  {
    code: 'EMPLOYER_FEEDBACK',
    title: 'Employer provides meaningful feedback on workplace performance',
    category: 'Quality',
  },
  {
    code: 'SAFEGUARDING',
    title: 'Safeguarding and wellbeing check completed',
    category: 'Safeguarding',
  },
  {
    code: 'SUPPORT_RISKS',
    title: 'Any support needs or risks identified and addressed',
    category: 'Safeguarding',
  },
  {
    code: 'SMART_ACTIONS',
    title: 'Clear SMART actions set for learner, employer, and coach',
    category: 'Actions',
  },
  {
    code: 'ACTIONS_LINKED',
    title: 'Actions linked to progress gaps or next assessment steps / EPA readiness',
    category: 'Actions',
  },
  {
    code: 'NOTES_QUALITY',
    title: 'Review notes are clear, specific, and not generic',
    category: 'Quality',
  },
  {
    code: 'SIGN_OFF',
    title: 'Review confirmed / signed off by all parties',
    category: 'Compliance',
  },
];

export function Step3Checklist({ form }: Step3ChecklistProps) {
  const { register, watch } = form;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          QA Checklist (13 Criteria)
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Evaluate each criterion and provide comments where necessary.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  Criterion
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b w-32">
                  Evaluation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  Comments
                </th>
              </tr>
            </thead>
            <tbody>
              {QA_CRITERIA.map((criterion, index) => {
                const status = watch(`checklist.${index}.status`);
                return (
                  <tr key={criterion.code} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {criterion.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {criterion.title}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            {...register(`checklist.${index}.status`)}
                            value="YES"
                            className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                          />
                          <span className="ml-1 text-xs text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            {...register(`checklist.${index}.status`)}
                            value="PARTIAL"
                            className="w-4 h-4 text-amber-600 border-gray-300 focus:ring-amber-500"
                          />
                          <span className="ml-1 text-xs text-gray-700">Partial</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            {...register(`checklist.${index}.status`)}
                            value="NO"
                            className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                          />
                          <span className="ml-1 text-xs text-gray-700">No</span>
                        </label>
                      </div>
                      <input
                        type="hidden"
                        {...register(`checklist.${index}.code`)}
                        value={criterion.code}
                      />
                      <input
                        type="hidden"
                        {...register(`checklist.${index}.title`)}
                        value={criterion.title}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        {...register(`checklist.${index}.comment`)}
                        rows={2}
                        placeholder={
                          status === 'NO' || status === 'PARTIAL'
                            ? 'Please provide details...'
                            : 'Optional comments...'
                        }
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Summary Sections
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strengths
            </label>
            <textarea
              {...register('strengths')}
              rows={4}
              placeholder="List the learner's key strengths demonstrated during this review period..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Areas for Development
            </label>
            <textarea
              {...register('areasForDevelopment')}
              rows={4}
              placeholder="Identify areas where the learner needs further development..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Professional Judgement
            </label>
            <textarea
              {...register('overallJudgement')}
              rows={5}
              placeholder="Provide your overall professional judgement on the learner's progress and readiness..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface Step4ActionsProps {
  form: UseFormReturn<ReviewFormData>;
}

export function Step4Actions({ form }: Step4ActionsProps) {
  const { register, watch, setValue } = form;
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const actions = watch('actions') || [];

  const [newAction, setNewAction] = useState({
    owner: 'LEARNER' as 'LEARNER' | 'EMPLOYER' | 'COACH',
    actionText: '',
    dueDate: '',
    linkedGap: '',
  });

  const handleAddAction = () => {
    if (!newAction.actionText.trim()) return;

    const updatedActions = [...actions];
    if (editingIndex !== null) {
      updatedActions[editingIndex] = {
        ...updatedActions[editingIndex],
        ...newAction,
      };
    } else {
      updatedActions.push({
        id: `action-${Date.now()}`,
        ...newAction,
        status: 'OPEN' as const,
      });
    }

    setValue('actions', updatedActions);
    setShowActionModal(false);
    setEditingIndex(null);
    setNewAction({
      owner: 'LEARNER',
      actionText: '',
      dueDate: '',
      linkedGap: '',
    });
  };

  const handleEditAction = (index: number) => {
    const action = actions[index];
    setNewAction({
      owner: action.owner,
      actionText: action.actionText,
      dueDate: action.dueDate || '',
      linkedGap: action.linkedGap || '',
    });
    setEditingIndex(index);
    setShowActionModal(true);
  };

  const handleDeleteAction = (index: number) => {
    if (confirm('Are you sure you want to delete this action?')) {
      const updatedActions = actions.filter((_, i) => i !== index);
      setValue('actions', updatedActions);
    }
  };

  const learnerSignedAt = watch('signOff.learnerSignedAt');
  const employerSignedAt = watch('signOff.employerSignedAt');
  const coachSignedAt = watch('signOff.coachSignedAt');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">SMART Actions</h3>
          <button
            type="button"
            onClick={() => {
              setEditingIndex(null);
              setNewAction({
                owner: 'LEARNER',
                actionText: '',
                dueDate: '',
                linkedGap: '',
              });
              setShowActionModal(true);
            }}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <i className="ri-add-line"></i>
            Add Action
          </button>
        </div>

        {actions.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <i className="ri-task-line text-4xl text-gray-400 mb-2"></i>
            <p className="text-gray-600 mb-4">
              No actions added yet. Create SMART actions for learner, employer,
              and coach.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action, index) => (
              <div
                key={action.id || index}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          action.owner === 'LEARNER'
                            ? 'bg-blue-100 text-blue-700'
                            : action.owner === 'EMPLOYER'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {action.owner}
                      </span>
                      {action.dueDate && (
                        <span className="text-xs text-gray-500">
                          Due: {action.dueDate}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 mb-2">
                      {action.actionText}
                    </p>
                    {action.linkedGap && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Linked to:</span>{' '}
                        {action.linkedGap}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handleEditAction(index)}
                      className="p-2 text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                    >
                      <i className="ri-edit-line"></i>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAction(index)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign Off</h3>
        <p className="text-sm text-gray-600 mb-6">
          All three parties must confirm and sign off the review before it can be
          marked as completed.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <i className="ri-user-line text-blue-700"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Learner Confirmation
                </p>
                {learnerSignedAt && (
                  <p className="text-xs text-gray-600">
                    Signed: {new Date(learnerSignedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setValue(
                  'signOff.learnerSignedAt',
                  learnerSignedAt ? null : new Date().toISOString()
                )
              }
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                learnerSignedAt
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {learnerSignedAt ? (
                <>
                  <i className="ri-check-line mr-1"></i>
                  Signed
                </>
              ) : (
                'Mark Signed'
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <i className="ri-briefcase-line text-purple-700"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Employer Confirmation
                </p>
                {employerSignedAt && (
                  <p className="text-xs text-gray-600">
                    Signed: {new Date(employerSignedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setValue(
                  'signOff.employerSignedAt',
                  employerSignedAt ? null : new Date().toISOString()
                )
              }
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                employerSignedAt
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {employerSignedAt ? (
                <>
                  <i className="ri-check-line mr-1"></i>
                  Signed
                </>
              ) : (
                'Mark Signed'
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <i className="ri-shield-user-line text-green-700"></i>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Skills Coach Confirmation
                </p>
                {coachSignedAt && (
                  <p className="text-xs text-gray-600">
                    Signed: {new Date(coachSignedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setValue(
                  'signOff.coachSignedAt',
                  coachSignedAt ? null : new Date().toISOString()
                )
              }
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                coachSignedAt
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {coachSignedAt ? (
                <>
                  <i className="ri-check-line mr-1"></i>
                  Signed
                </>
              ) : (
                'Mark Signed'
              )}
            </button>
          </div>
        </div>
      </div>

      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingIndex !== null ? 'Edit Action' : 'Add New Action'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionModal(false);
                    setEditingIndex(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Owner
                  </label>
                  <select
                    value={newAction.owner}
                    onChange={(e) =>
                      setNewAction({
                        ...newAction,
                        owner: e.target.value as 'LEARNER' | 'EMPLOYER' | 'COACH',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="LEARNER">Learner</option>
                    <option value="EMPLOYER">Employer</option>
                    <option value="COACH">Skills Coach</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action Text (SMART)
                  </label>
                  <textarea
                    value={newAction.actionText}
                    onChange={(e) =>
                      setNewAction({ ...newAction, actionText: e.target.value })
                    }
                    rows={4}
                    placeholder="Describe the specific, measurable, achievable, relevant, and time-bound action..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newAction.dueDate}
                    onChange={(e) =>
                      setNewAction({ ...newAction, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Linked to Progress Gap or Next Assessment Step
                  </label>
                  <input
                    type="text"
                    value={newAction.linkedGap}
                    onChange={(e) =>
                      setNewAction({ ...newAction, linkedGap: e.target.value })
                    }
                    placeholder="e.g., KSB K3, EPA preparation, Communication skills"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionModal(false);
                    setEditingIndex(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddAction}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
                >
                  {editingIndex !== null ? 'Update Action' : 'Add Action'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}