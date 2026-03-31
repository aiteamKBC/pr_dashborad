import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { mockProgressReviews } from '../../../mocks/progress-reviews';
import type { ChecklistStatus, ReviewRecord, ReviewStatus } from '../../../types/progress-review';

interface LearnerDetailPageProps {
  learnerId: string;
  reviews?: ReviewRecord[];
  onBack: () => void;
  initialReviewId?: string | null;
  initialTab?: TabId;
}

type TabId = 'overview' | 'reviews' | 'checklist';

const statusConfig: Record<
  ReviewStatus,
  {
    label: string;
    badge: string;
    accent: string;
    border: string;
    panel: string;
  }
> = {
  COMPLETED: {
    label: 'Completed',
    badge: 'border-emerald-200 bg-emerald-50/80 text-emerald-800',
    accent: 'bg-emerald-600',
    border: 'border-slate-200',
    panel: 'from-[#fcfdfb] via-[#f8fbfa] to-white',
  },
  BOOKING: {
    label: 'Booking',
    badge: 'border-sky-200 bg-sky-50/80 text-sky-800',
    accent: 'bg-sky-600',
    border: 'border-slate-200',
    panel: 'from-[#fbfcfe] via-[#f8fafc] to-white',
  },
  AT_RISK: {
    label: 'At Risk',
    badge: 'border-amber-200 bg-amber-50/80 text-amber-800',
    accent: 'bg-amber-600',
    border: 'border-slate-200',
    panel: 'from-[#fffdf8] via-[#fffaf0] to-white',
  },
  OVERDUE: {
    label: 'Overdue',
    badge: 'border-rose-200 bg-rose-50/80 text-rose-800',
    accent: 'bg-rose-600',
    border: 'border-slate-200',
    panel: 'from-[#fffafb] via-[#fff8f8] to-white',
  },
};

export default function LearnerDetailPage({
  learnerId,
  reviews = mockProgressReviews,
  onBack,
  initialReviewId = null,
  initialTab = 'overview',
}: LearnerDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);

  const learnerReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.learner.id === learnerId)
        .sort((a, b) => new Date(b.lastReviewDate).getTime() - new Date(a.lastReviewDate).getTime()),
    [learnerId, reviews]
  );

  const latestReview = learnerReviews[0];
  const learner = latestReview?.learner;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, learnerId]);

  useEffect(() => {
    if (!learnerReviews.length) {
      setSelectedReview(null);
      return;
    }

    if (initialReviewId) {
      const matchedReview = learnerReviews.find((review) => review.id === initialReviewId) || null;
      setSelectedReview(matchedReview ?? learnerReviews[0]);
      return;
    }

    setSelectedReview(null);
  }, [initialReviewId, learnerId, learnerReviews]);

  const stats = useMemo(() => {
    const total = learnerReviews.length;
    const allActions = learnerReviews.flatMap((review) => review.actions);
    const allChecklist = learnerReviews.flatMap((review) => review.checklist);
    const yesCount = allChecklist.filter((item) => item.evaluation === 'YES').length;
    const complianceRate = allChecklist.length ? Math.round((yesCount / allChecklist.length) * 100) : 0;

    return {
      total,
      signedOff: learnerReviews.filter((review) => review.signedOff).length,
      openActions: allActions.filter((action) => action.status === 'OPEN').length,
      doneActions: allActions.filter((action) => action.status === 'DONE').length,
      complianceRate,
      plannedOtj: latestReview?.plannedOtj ?? null,
      submittedOtj: latestReview?.submittedOtj ?? null,
      expectedOtj: latestReview?.expectedOtj ?? null,
      otjStatus: latestReview?.otjHoursStatus ?? '',
    };
  }, [learnerReviews, latestReview]);

  if (!learner || !latestReview) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <i className="ri-user-unfollow-line text-3xl"></i>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Learner not found</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
          We could not find a progress review record for this learner in the current dataset.
        </p>
        <button
          onClick={onBack}
          className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Back to Reviews
        </button>
      </div>
    );
  }

  const currentStatus = statusConfig[latestReview.status];
  const learnerInitials = learner.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const tabs: Array<{ id: TabId; label: string; icon: string; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: 'ri-layout-grid-line' },
    { id: 'reviews', label: 'Review History', icon: 'ri-file-history-line', count: learnerReviews.length },
    { id: 'checklist', label: 'QA Checklist', icon: 'ri-checkbox-multiple-line' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_26%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_38%,#f8fafc_100%)] text-slate-900">
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
            >
              <i className="ri-arrow-left-line"></i>
              Back to Reviews
            </button>
            <span className="hidden text-slate-300 sm:inline">/</span>
            <span className="truncate text-sm font-semibold text-slate-700">{learner.name}</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 shadow-sm md:flex">
            <span className={`h-2 w-2 rounded-full ${currentStatus.accent}`}></span>
            Inspection-ready view
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 lg:py-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_52%,#f0fdfa_100%)] shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="px-5 py-5 lg:px-6 lg:py-6">
            <div className="rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#0f172a_0%,#155e75_55%,#0f766e_100%)] text-2xl font-black text-white shadow-[0_16px_30px_rgba(14,116,144,0.24)]">
                    {learnerInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">Tripartite Progress Review</p>
                    <h1 className="mt-2 text-[30px] font-black leading-[0.95] tracking-[-0.04em] text-slate-950">
                      {learner.name}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                      Learner overview for review readiness, meeting evidence, coaching follow-up, and inspection context.
                    </p>
                  </div>
                </div>
                <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm ${currentStatus.badge}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${currentStatus.accent}`}></span>
                  {currentStatus.label}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard icon="ri-book-open-line" label="Programme" value={latestReview.programme} />
                <InfoCard icon="ri-team-line" label="Group" value={latestReview.group} />
                <InfoCard icon="ri-user-star-line" label="Skills Coach" value={latestReview.coach.name} />
                <InfoCard icon="ri-briefcase-line" label="Employer" value={latestReview.employer.name} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <MetricCard icon="ri-file-list-3-line" label="Total Reviews" value={stats.total} tone="slate" />
          <MetricCard icon="ri-checkbox-circle-line" label="Signed Off" value={stats.signedOff} tone="green" />
          <MetricCard icon="ri-task-line" label="Open Actions" value={stats.openActions} tone="amber" />
          <MetricCard icon="ri-shield-check-line" label="Compliance" value={`${stats.complianceRate}%`} tone="green" />
          <MetricCard icon="ri-calendar-line" label="Planned OTJ" value={formatHours(stats.plannedOtj)} tone="slate" />
          <MetricCard icon="ri-upload-2-line" label="Submitted OTJ" value={formatHours(stats.submittedOtj)} tone="amber" />
          <StatusMetricCard icon="ri-pulse-line" label="OTJ Status" value={stats.otjStatus} />
        </section>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-3 py-3 sm:px-5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-[linear-gradient(135deg,#0891b2_0%,#0f766e_100%)] text-white shadow-[0_12px_22px_rgba(8,145,178,0.22)]'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
                {typeof tab.count === 'number' ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'overview' ? <OverviewTab latestReview={latestReview} /> : null}
            {activeTab === 'reviews' ? (
              <ReviewsTab
                reviews={learnerReviews}
                selectedReview={selectedReview}
                onSelectReview={setSelectedReview}
              />
            ) : null}
            {activeTab === 'checklist' ? <ChecklistTab reviews={learnerReviews} /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_14px_30px_rgba(8,145,178,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#f0f9ff_0%,#ecfeff_100%)] text-cyan-700 shadow-sm">
          <i className={`${icon} text-sm`}></i>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-900">{value || '--'}</p>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-[22px] font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string | number;
  tone: 'slate' | 'teal' | 'green' | 'amber';
}) {
  const tones = {
    slate: {
      card: 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]',
      icon: 'bg-[#eef4fb] text-slate-700',
      value: 'text-slate-950',
    },
    teal: {
      card: 'border-cyan-100 bg-[linear-gradient(180deg,#f3fbff_0%,#ffffff_100%)]',
      icon: 'bg-cyan-50 text-cyan-700',
      value: 'text-cyan-900',
    },
    green: {
      card: 'border-emerald-100 bg-[linear-gradient(180deg,#f3fcf7_0%,#ffffff_100%)]',
      icon: 'bg-emerald-50 text-emerald-700',
      value: 'text-emerald-900',
    },
    amber: {
      card: 'border-amber-100 bg-[linear-gradient(180deg,#fff9ef_0%,#ffffff_100%)]',
      icon: 'bg-amber-50 text-amber-700',
      value: 'text-amber-900',
    },
  };

  const color = tones[tone];

  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] ${color.card}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color.icon}`}>
        <i className={`${icon} text-sm`}></i>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className={`text-[28px] font-bold tracking-tight ${color.value}`}>{value}</p>
      </div>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  );
}

function StatusMetricCard({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  const normalized = (value || '').trim().toLowerCase();
  const tone =
    normalized === 'ahead'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : normalized === 'behind'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : normalized === 'need attention'
      ? 'border-red-200 bg-red-50 text-red-700'
      : normalized === 'at risk'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
        <i className={`${icon} text-sm`}></i>
      </div>
      <span className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-sm font-semibold ${tone}`}>
        {value || '--'}
      </span>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  );
}

function OverviewTab({ latestReview }: { latestReview: ReviewRecord }) {
  const reviewDate = new Date(latestReview.lastReviewDate);
  const dueDate = new Date(latestReview.nextDueDate);
  const reminderDate = new Date(reviewDate);
  reminderDate.setDate(reminderDate.getDate() + 56);
  const coachDeliveryCheck = getCoachDeliveryCheck(latestReview);

  const today = new Date();
  const totalCycleDays = Math.max(1, Math.round((dueDate.getTime() - reviewDate.getTime()) / 86400000));
  const elapsedDays = Math.round((today.getTime() - reviewDate.getTime()) / 86400000);
  const cyclePercent = Math.max(6, Math.min(100, Math.round((elapsedDays / totalCycleDays) * 100)));
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays >= 0 && diffDays <= 14;

  const noticeTone = isOverdue
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : isDueSoon
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#fcfcfa_0%,#ffffff_100%)] p-5 shadow-[0_8px_20px_rgba(15,23,42,0.03)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Review cycle</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">Inspection timeline status</h3>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${noticeTone}`}>
              {isOverdue ? `${Math.abs(diffDays)} day(s) overdue` : diffDays === 0 ? 'Due today' : `${diffDays} day(s) remaining`}
            </span>
          </div>

          <div className="mt-6">
            <div className="mb-3 grid grid-cols-3 gap-3 text-xs font-medium text-slate-400">
              <span>Last review</span>
              <span className="text-center">Reminder point</span>
              <span className="text-right">Due date</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  isOverdue ? 'bg-rose-500' : isDueSoon ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${cyclePercent}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm font-semibold text-slate-700">
              <span>{format(reviewDate, 'dd MMM yyyy')}</span>
              <span className="text-center">{format(reminderDate, 'dd MMM yyyy')}</span>
              <span className="text-right">{format(dueDate, 'dd MMM yyyy')}</span>
            </div>
          </div>

          <div className={`mt-6 rounded-2xl border px-4 py-4 ${noticeTone}`}>
            <div className="flex items-start gap-3">
              <i className={`mt-0.5 text-lg ${isOverdue ? 'ri-alarm-warning-line' : isDueSoon ? 'ri-time-line' : 'ri-checkbox-circle-line'}`}></i>
              <div>
                <p className="text-sm font-semibold">
                  {isOverdue ? 'Immediate scheduling attention required' : isDueSoon ? 'Next review window is approaching' : 'Cycle is currently within expected timeframe'}
                </p>
                <p className="mt-1 text-xs leading-5 opacity-90">
                  {isOverdue
                    ? 'The learner is beyond the review deadline and should be prioritised for scheduling and evidence capture.'
                    : isDueSoon
                    ? 'This record is close to the deadline and should be prepared for meeting confirmation, attendee checks, and sign-off.'
                    : 'The learner is on track with the current review cycle and can continue through standard monitoring.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-[#fffefc] p-5 shadow-[0_8px_20px_rgba(15,23,42,0.03)] sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Participants</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Meeting roles</h3>
          <div className="mt-5 space-y-3">
            <ParticipantRow role="Learner" name={latestReview.learner.name} icon="ri-user-line" tone="teal" />
            <ParticipantRow role="Skills Coach" name={latestReview.coach.name} icon="ri-user-star-line" tone="amber" />
            <ParticipantRow role="Employer" name={latestReview.employer.name} icon="ri-briefcase-line" tone="green" />
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-[#fffefc] p-5 shadow-[0_8px_20px_rgba(15,23,42,0.03)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Latest narrative</p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">Summary for inspection review</h3>
          </div>
          <span className="rounded-full bg-[#f3f4f6] px-3 py-1.5 text-xs font-semibold text-slate-600">
            {format(reviewDate, 'dd MMM yyyy')}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <NarrativeCard title="Strengths" items={latestReview.strengths} icon="ri-thumb-up-line" tone="green" />
          <NarrativeCard
            title="Areas for Development"
            items={latestReview.areasForDevelopment}
            icon="ri-lightbulb-flash-line"
            tone="amber"
          />
          <div className="rounded-3xl border border-teal-100 bg-[linear-gradient(180deg,#f0fdfa_0%,#ffffff_100%)] p-5">
            <div className="flex items-center gap-2">
              <i className="ri-award-line text-teal-700"></i>
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Overall Judgement</h4>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              {latestReview.overallJudgement || 'No overall judgement has been recorded for the latest review.'}
            </p>
          </div>
        </div>

        <div className={`mt-4 rounded-2xl border px-4 py-3.5 ${coachDeliveryCheck.tone}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Coach Delivery Check</p>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold">
              {coachDeliveryCheck.badge}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6">{coachDeliveryCheck.note}</p>
        </div>
      </div>
    </div>
  );
}

function ParticipantRow({
  role,
  name,
  icon,
  tone,
}: {
  role: string;
  name: string;
  icon: string;
  tone: 'teal' | 'amber' | 'green';
}) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>
        <i className={`${icon} text-base`}></i>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{role}</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{name}</p>
      </div>
    </div>
  );
}

function NarrativeCard({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: string;
  tone: 'green' | 'amber';
}) {
  const tones = {
    green: {
      wrap: 'border-emerald-100 bg-[linear-gradient(180deg,#f0fdf4_0%,#ffffff_100%)]',
      icon: 'text-emerald-700',
      title: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    amber: {
      wrap: 'border-amber-100 bg-[linear-gradient(180deg,#fffbeb_0%,#ffffff_100%)]',
      icon: 'text-amber-700',
      title: 'text-amber-800',
      dot: 'bg-amber-500',
    },
  };

  const color = tones[tone];

  return (
    <div className={`h-full rounded-3xl border p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${color.wrap}`}>
      <div className="flex items-center gap-2">
        <i className={`${icon} ${color.icon}`}></i>
        <h4 className={`text-xs font-semibold uppercase tracking-[0.16em] ${color.title}`}>{title}</h4>
      </div>
      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${title}-${index}`} className="flex items-start gap-3">
              <span className={`mt-2 h-2 w-2 rounded-full ${color.dot}`}></span>
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500">No notes captured in this section.</p>
        )}
      </div>
    </div>
  );
}

function ReviewsTab({
  reviews,
  selectedReview,
  onSelectReview,
}: {
  reviews: ReviewRecord[];
  selectedReview: ReviewRecord | null;
  onSelectReview: (review: ReviewRecord | null) => void;
}) {
  if (!reviews.length) {
    return <EmptyState icon="ri-file-history-line" message="No reviews recorded yet." />;
  }

  const activeReview = selectedReview ?? reviews[0];
  const coachDeliveryCheck = getCoachDeliveryCheck(activeReview);

  const evaluationTone = (value: ChecklistStatus | '') => {
    if (value === 'YES') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (value === 'PARTIAL') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-3">
        {reviews.map((review, index) => {
          const yesCount = review.checklist.filter((item) => item.evaluation === 'YES').length;
          const compliance = review.checklist.length ? Math.round((yesCount / review.checklist.length) * 100) : 0;
          const selected = activeReview.id === review.id;
          const reviewStatus = statusConfig[review.status];

          return (
            <button
              key={review.id}
              onClick={() => onSelectReview(review)}
              className={`w-full rounded-[24px] border p-4 text-left transition ${
                selected
                  ? 'border-cyan-200 bg-[linear-gradient(135deg,#0f172a_0%,#12304d_48%,#0f766e_100%)] text-white shadow-[0_18px_38px_rgba(8,145,178,0.22)]'
                  : 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_6px_18px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_12px_28px_rgba(8,145,178,0.10)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`text-xs font-semibold uppercase tracking-[0.14em] ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                  Review {reviews.length - index}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    selected ? 'border-white/15 bg-white/10 text-white' : reviewStatus.badge
                  }`}
                >
                  {reviewStatus.label}
                </span>
              </div>

              <p className={`mt-4 text-lg font-bold ${selected ? 'text-white' : 'text-slate-900'}`}>
                {formatDate(review.lastReviewDate)}
              </p>
              <p className={`mt-1 text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>{review.coach.name}</p>

              <div className="mt-4">
                <div className={`mb-1.5 flex items-center justify-between text-xs ${selected ? 'text-cyan-100/90' : 'text-slate-500'}`}>
                  <span>Compliance</span>
                  <span className={`font-semibold ${selected ? 'text-white' : 'text-slate-800'}`}>{compliance}%</span>
                </div>
                <div className={`h-2 overflow-hidden rounded-full ${selected ? 'bg-white/15' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full rounded-full ${compliance >= 80 ? 'bg-emerald-500' : compliance >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${compliance}%` }}
                  />
                </div>
              </div>

              <div className={`mt-4 flex flex-wrap items-center gap-3 text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                <span className="inline-flex items-center gap-1">
                  <i className="ri-time-line"></i>
                  {review.duration ? `${review.duration} min` : '--'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <i className="ri-checkbox-circle-line"></i>
                  {review.signedOff ? 'Signed off' : 'Pending'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected review</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">{formatDate(activeReview.lastReviewDate)}</h3>
            <p className="mt-1 text-sm text-slate-500">
              Coach: {activeReview.coach.name} | Employer: {activeReview.employer.name}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${activeReview.signedOff ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
            {activeReview.signedOff ? 'Signed Off' : 'Pending Sign-off'}
          </span>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetaPanel label="Duration" value={activeReview.duration ? `${activeReview.duration} min` : '--'} icon="ri-time-line" />
          <MetaPanel label="OTJ Hours" value={`${activeReview.otjHours ?? 0}h`} icon="ri-bar-chart-line" />
          <MetaPanel label="Location" value={activeReview.location || '--'} icon="ri-map-pin-line" />
          <MetaPanel
            label="Attendance"
            value={
              activeReview.attendance === 'ALL_PRESENT'
                ? 'All Present'
                : activeReview.attendance === 'PARTIAL'
                ? 'Partial'
                : 'Missing'
            }
            icon="ri-group-line"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div
            className={`h-full rounded-3xl border px-5 py-4 shadow-[0_8px_22px_rgba(15,23,42,0.04)] ${coachDeliveryCheck.tone}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Coach Delivery Check</p>
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold">
                {coachDeliveryCheck.badge}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6">{coachDeliveryCheck.note}</p>
          </div>

          <div className="h-full rounded-3xl border border-teal-100 bg-[linear-gradient(180deg,#f0fdfa_0%,#ffffff_100%)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <i className="ri-award-line text-teal-700"></i>
              <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">Overall Judgement</h4>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              {activeReview.overallJudgement || 'No overall judgement has been recorded.'}
            </p>
          </div>

          <NarrativeCard title="Strengths" items={activeReview.strengths} icon="ri-thumb-up-line" tone="green" />
          <NarrativeCard
            title="Areas for Development"
            items={activeReview.areasForDevelopment}
            icon="ri-lightbulb-flash-line"
            tone="amber"
          />

          {activeReview.actions.length > 0 ? (
            <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#fcfcfa_0%,#ffffff_100%)] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04)] md:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <i className="ri-task-line text-teal-700"></i>
                <h4 className="text-sm font-semibold text-slate-900">
                  SMART Actions ({activeReview.actions.length})
                </h4>
              </div>
              <div className="space-y-2.5">
                {activeReview.actions.map((action) => (
                  <div key={action.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-6 text-slate-800">{action.action}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                          {action.owner}
                        </span>
                        {action.dueDate ? <span>Due {formatDate(action.dueDate)}</span> : null}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${action.status === 'DONE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {action.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MetaPanel({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 text-slate-500">
        <i className={`${icon} text-sm`}></i>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function ChecklistTab({ reviews }: { reviews: ReviewRecord[] }) {
  const latestReview = reviews[0];

  if (!latestReview?.checklist?.length) {
    return <EmptyState icon="ri-checkbox-multiple-line" message="No checklist data available yet." />;
  }

  const totalEvaluations = latestReview.checklist.length;
  const yesCount = latestReview.checklist.filter((item) => item.evaluation === 'YES').length;
  const partialCount = latestReview.checklist.filter((item) => item.evaluation === 'PARTIAL').length;
  const noCount = latestReview.checklist.filter((item) => item.evaluation === 'NO').length;
  const overallRate = totalEvaluations ? Math.round((yesCount / totalEvaluations) * 100) : 0;

  const evaluationTone = (value: ChecklistStatus | '') => {
    if (value === 'YES') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (value === 'PARTIAL') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-rose-200 bg-rose-50 text-rose-700';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <ComplianceRing value={overallRate} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">QA summary</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">Overall QA Compliance</h3>
              <p className="mt-1 text-sm text-slate-500">
                Based on the latest review dated {formatDate(latestReview.lastReviewDate)}.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat label="Criteria" value={totalEvaluations} />
            <MiniStat label="Yes" value={yesCount} />
            <MiniStat label="Partial / No" value={`${partialCount} / ${noCount}`} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {latestReview.checklist.map((item, index) => (
          <div key={`${item.id}-${index}`} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-6 text-slate-900">{item.category}</p>
                </div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${evaluationTone(item.evaluation)}`}>
                {item.evaluation || '--'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplianceRing({ value }: { value: number }) {
  const stroke = 163.4;
  const progress = Math.max(0, Math.min(stroke, (value / 100) * stroke));
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="relative h-20 w-20 flex-shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${progress} ${stroke}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900">
        {value}%
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
      <p className="text-lg font-bold text-slate-950">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
      <i className={`${icon} text-4xl text-slate-300`}></i>
      <p className="mt-4 text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}

function formatHours(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  return `${Math.round(value)}h`;
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return format(date, 'dd MMM yyyy');
}

function getCoachDeliveryCheck(review: ReviewRecord) {
  const sourceText = [review.reportText || '', review.overallJudgement || '', review.riskNotes || '']
    .join(' ')
    .toLowerCase();

  const coachName = (review.coach.name || '').toLowerCase();
  const learnerName = (review.learner.name || '').toLowerCase();
  const employerName = (review.employer.name || '').toLowerCase();

  const substituteSignals = [
    'substitute',
    'covered by',
    'cover coach',
    'in place of',
    'instead of',
    'on behalf of',
    'delivered by',
    'facilitated by',
    'led by',
    'ran the session',
  ];

  const coachLeadSignals = [
    coachName,
    'coach led',
    'skills coach led',
    'coach discussed',
    'coach reviewed',
    'coach confirmed',
  ].filter(Boolean);

  const substituteDetected =
    substituteSignals.some((signal) => sourceText.includes(signal)) &&
    (!coachName || !sourceText.includes(coachName) || sourceText.includes(learnerName) || sourceText.includes(employerName));

  if (substituteDetected) {
    return {
      tone: 'border-amber-200 bg-amber-50 text-amber-800',
      badge: 'Substitute flag',
      note: 'Session notes suggest the recorded coach may not have led this session, and a substitute or alternate participant may have delivered it.',
    };
  }

  const coachConfirmed = coachLeadSignals.some((signal) => sourceText.includes(signal));
  if (coachConfirmed) {
    return {
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      badge: 'Coach confirmed',
      note: 'Available session evidence indicates that the assigned coach was actively leading or speaking during the review.',
    };
  }

  return {
    tone: 'border-slate-200 bg-slate-50 text-slate-700',
    badge: 'Check required',
    note: 'No clear speaking evidence was found in the available notes to confirm that the assigned coach personally led this session.',
  };
}
