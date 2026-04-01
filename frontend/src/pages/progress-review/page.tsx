
import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import type { ReviewRecord, ReviewStatus, ChecklistStatus, ContactOutcome } from '../../types/progress-review';
import LearnerDetailPage from './components/LearnerDetailPage';
import ErrorBoundary from '../../shared/components/ErrorBoundary';

type ProgressReviewsOverviewResponse = {
  table: string;
  reviews: ReviewRecord[];
};

type SessionReportResponse = {
  reportText?: string;
  sourceCount?: number;
  summary?: {
    totalSessions?: number;
    uniqueLearners?: number;
    uniqueCoaches?: number;
    checklistWeightedCompliancePercent?: number;
  };
};

type RAGTooltipSession = {
  learnerName: string;
  meetingDate: string;
};

type RAGTooltipItem = {
  name: string;
  value: number;
  pct: number;
  color: string;
  tone: string;
  sessions: RAGTooltipSession[];
  extraCount: number;
};

type CompliancePopupItem = {
  name: string;
  value: number;
  pct: number;
  color: string;
  evidence?: Array<{
    criterion: string;
    meetingDate: string;
    coachName: string;
  }>;
};

type ManagerAttendancePopupItem = {
  name: string;
  value: number;
  pct: number;
  color: string;
  sessions: Array<{
    learnerName: string;
    meetingDate: string;
    coachName: string;
    managerName: string;
  }>;
};

const STATUS_COLORS = {
  completed: '#3ED0A1',
  booking: '#9AA3AF',
  atRisk: '#F5C84C',
  overdue: '#F46F88',
} as const;

const COMPLIANCE_COLORS = {
  yes: '#3ED0A1',
  partial: '#F5C84C',
  no: '#F46F88',
} as const;

const OTJ_COLORS = {
  ahead: '#3ED0A1',
  atRisk: '#F5C84C',
  behind: '#B8C0CC',
  needAttention: '#F46F88',
} as const;

const KPI_STYLES = {
  violet: {
    iconWrap: 'bg-slate-100',
    icon: 'text-slate-700',
    tag: 'text-slate-700 bg-slate-100',
  },
  green: {
    iconWrap: 'bg-emerald-50',
    icon: 'text-emerald-700',
    tag: 'text-emerald-800 bg-emerald-50',
  },
  blue: {
    iconWrap: 'bg-slate-100',
    icon: 'text-slate-700',
    tag: 'text-slate-700 bg-slate-100',
  },
  amber: {
    iconWrap: 'bg-amber-50',
    icon: 'text-amber-700',
    tag: 'text-amber-800 bg-amber-50',
  },
  red: {
    iconWrap: 'bg-rose-50',
    icon: 'text-rose-700',
    tag: 'text-rose-800 bg-rose-50',
  },
} as const;

type KPIColor = keyof typeof KPI_STYLES;
type DashboardDatePreset = 'ALL' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'CUSTOM';
type ChecklistCellEvidenceItem = {
  learnerName: string;
  category: string;
  evaluation: string;
  comments: string;
  meetingDate: string;
  coachName: string;
  managerName: string;
};

function RAGSessionsPopup({ item, onClose }: { item: RAGTooltipItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{item.name} Sessions</span>
              </div>
              <h4 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Learners and meeting dates</h4>
              <p className="mt-1 text-sm text-slate-500">{item.value} sessions in this RAG rating</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {item.sessions.map((session, index) => (
              <div
                key={`${session.learnerName}-${session.meetingDate}-${index}`}
                className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-sm"
              >
                <div className="text-base font-semibold text-slate-900">{session.learnerName}</div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  <i className="ri-calendar-line text-slate-400"></i>
                  {session.meetingDate}
                </div>
              </div>
            ))}
          </div>
          {item.extraCount > 0 ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
              + {item.extraCount} more sessions in this rating
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChecklistEvidencePopup({ item, onClose }: { item: CompliancePopupItem; onClose: () => void }) {
  const evidenceRows = Array.isArray(item.evidence) ? item.evidence : [];
  const [coachFilter, setCoachFilter] = useState('ALL');

  const coachOptions = useMemo(
    () => ['ALL', ...Array.from(new Set(evidenceRows.map((row) => row.coachName).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [evidenceRows]
  );

  const filteredRows = useMemo(
    () => (coachFilter === 'ALL' ? evidenceRows : evidenceRows.filter((row) => row.coachName === coachFilter)),
    [coachFilter, evidenceRows]
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{item.name} Checklist</span>
              </div>
              <h4 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Checklist items and dates</h4>
              <p className="mt-1 text-sm text-slate-500">{item.value} checklist evaluations in this status</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Filter by coach</div>
              <div className="mt-1 text-sm text-slate-500">Narrow checklist evidence to one coach</div>
            </div>
            <div className="relative min-w-[220px]">
              <select
                value={coachFilter}
                onChange={(event) => setCoachFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
              >
                <option value="ALL">All Coaches</option>
                {coachOptions.filter((option) => option !== 'ALL').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {filteredRows.map((row, index) => (
              <div
                key={`${row.criterion}-${row.meetingDate}-${row.coachName}-${index}`}
                className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-sm"
              >
                <div className="text-base font-semibold text-slate-900">{row.criterion}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <i className="ri-calendar-line text-slate-400"></i>
                    {row.meetingDate}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    <i className="ri-user-star-line text-sky-500"></i>
                    {row.coachName}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredRows.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
              No checklist items found for this coach.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChecklistCellEvidencePopup({ item, onClose }: { item: ChecklistCellEvidenceItem; onClose: () => void }) {
  const evaluationLabel =
    item.evaluation === 'YES' ? 'Yes' : item.evaluation === 'PARTIAL' ? 'Partial' : item.evaluation === 'NO' ? 'No' : item.evaluation;
  const evaluationClasses =
    item.evaluation === 'YES'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : item.evaluation === 'PARTIAL'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Checklist Evidence</div>
              <h4 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{item.category}</h4>
              <p className="mt-1 text-sm text-slate-500">{item.learnerName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${evaluationClasses}`}>
              {evaluationLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              <i className="ri-calendar-line text-slate-400"></i>
              {item.meetingDate}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Coach</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{item.coachName || '-'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Manager</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{item.managerName || '-'}</div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Comment / Evidence</div>
            <div className="mt-2 text-sm leading-6 text-slate-700">
              {item.comments && item.comments.trim() ? item.comments : 'No additional evidence was recorded for this checklist item.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ManagerAttendancePopup({ item, onClose }: { item: ManagerAttendancePopupItem; onClose: () => void }) {
  const [coachFilter, setCoachFilter] = useState('ALL');

  const coachOptions = useMemo(
    () => ['ALL', ...Array.from(new Set(item.sessions.map((session) => session.coachName).filter(Boolean))).sort((a, b) => a.localeCompare(b))],
    [item.sessions]
  );

  const filteredSessions = useMemo(
    () => (coachFilter === 'ALL' ? item.sessions : item.sessions.filter((session) => session.coachName === coachFilter)),
    [coachFilter, item.sessions]
  );

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[540px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{item.name}</span>
              </div>
              <h4 className="mt-2 text-xl font-bold tracking-tight text-slate-900">Learners, coaches, and meeting dates</h4>
              <p className="mt-1 text-sm text-slate-500">{item.value} sessions in this attendance group</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Filter by coach</div>
              <div className="mt-1 text-sm text-slate-500">Narrow attendance details to one coach</div>
            </div>
            <div className="relative min-w-[220px]">
              <select
                value={coachFilter}
                onChange={(event) => setCoachFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-4 focus:ring-sky-100"
              >
                <option value="ALL">All Coaches</option>
                {coachOptions.filter((option) => option !== 'ALL').map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto px-4 py-4">
          <div className="space-y-3">
            {filteredSessions.map((session, index) => (
              <div
                key={`${session.learnerName}-${session.meetingDate}-${index}`}
                className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3 shadow-sm"
              >
                <div className="text-base font-semibold text-slate-900">{session.learnerName}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    <i className="ri-calendar-line text-slate-400"></i>
                    {session.meetingDate}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    <i className="ri-user-star-line text-sky-500"></i>
                    <span className="font-semibold">Coach:</span>
                    {session.coachName}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    <i className="ri-briefcase-line text-violet-500"></i>
                    <span className="font-semibold">Manager:</span>
                    {session.managerName}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredSessions.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
              No attendance sessions found for this coach.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatDurationMinutes(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return `${Math.round(value)} min`;
}

const QA_REPORT_TITLE = 'TRIPARTITE PROGRESS REVIEW - QA CHECKLIST';
const QA_REPORT_CRITERIA = [
  {
    category: 'Review within timeframe',
    match: ['within required timeframe', 'timeframe', 'review date', 'next due'],
  },
  {
    category: 'Duration (One Hour)',
    match: ['duration', 'one hour', 'meeting length'],
  },
  {
    category: 'Attendance (All parties present)',
    match: ['attendance', 'all present', 'learner, employer, and skill coach'],
  },
  {
    category: 'Progress vs KSBs',
    match: ['ksb', 'progress', 'apprenticeship standard', 'knowledge, skills'],
  },
  {
    category: 'OTJ Hours Reviewed',
    match: ['otj', 'off-the-job', 'off the job', 'hours reviewed'],
  },
  {
    category: 'Learner Explains Learning & Application',
    match: ['learner presentation', 'learner explains', 'application', 'workplace'],
  },
  {
    category: 'Employer Feedback',
    match: ['employer', 'feedback', 'manager'],
  },
  {
    category: 'Safeguarding & Wellbeing Check',
    match: ['safeguarding', 'wellbeing', 'welfare'],
  },
  {
    category: 'Support Needs/Risks Addressed',
    match: ['support needs', 'risks', 'risk', 'additional learning support'],
  },
  {
    category: 'SMART Actions Set',
    match: ['smart actions', 'action set', 'action plan'],
  },
  {
    category: 'Actions Linked to KSB Gaps / EPA',
    match: ['ksb gaps', 'epa', 'assessment steps', 'next assessment'],
  },
  {
    category: 'Notes Clear & Non-Generic',
    match: ['notes', 'clear', 'specific', 'non-generic'],
  },
  {
    category: 'Review Signed Off',
    match: ['signed off', 'confirmed by all parties', 'sign off'],
  },
] as const;

const QA_CRITERIA_BULLETS = [
  'Review held within required timeframe',
  'Duration (one Hour)',
  'Learner, employer, and skill coach all attended',
  'Progress clearly discussed against the apprenticeship standard / KSBs',
  'Off-the-job training hours reviewed and accurately recorded',
  'Learner can explain what they have learned and applied at work',
  'Employer provides meaningful feedback on workplace performance',
  'Safeguarding and wellbeing check completed',
  'Any support needs or risks identified and addressed',
  'Clear, SMART actions set for learner, employer, and coach',
  'Actions linked to progress gaps or next assessment steps',
  'Review notes are clear, specific, and not generic',
  'Review is signed off / confirmed by all parties',
] as const;

const CONTACT_UPDATES_STORAGE_KEY = 'progress-review-contact-updates';

function ReviewTrendTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: any }> }) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;

  const data = payload[0].payload;
  const sessionDates = Array.isArray(data.sessionDates) ? data.sessionDates : [];

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs shadow-xl"
      style={{ boxShadow: '0 10px 28px rgba(15,23,42,0.10)' }}
    >
      <div className="mb-2 border-b border-slate-100 pb-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Evidence</div>
        <div className="mt-1 font-semibold text-slate-900">{data.monthLabel || data.weekRangeLabel || data.label}</div>
      </div>
      <div className="space-y-1.5 text-[11px] text-slate-700">
        <div className="flex items-center justify-between gap-3">
          <span>Completed</span>
          <span className="font-semibold text-slate-900">{data.completed ?? 0}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Booking</span>
          <span className="font-semibold text-slate-900">{data.booking ?? 0}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>At risk</span>
          <span className="font-semibold text-slate-900">{data.atRisk ?? 0}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Overdue</span>
          <span className="font-semibold text-slate-900">{data.overdue ?? 0}</span>
        </div>
      </div>
      {sessionDates.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <div className="mb-1 text-[11px] font-semibold text-slate-500">Session dates</div>
          <div className="space-y-1 text-slate-700">
            {sessionDates.slice(0, 6).map((sessionDate: string) => (
              <div key={sessionDate}>{sessionDate}</div>
            ))}
            {sessionDates.length > 6 ? <div className="text-[11px] text-gray-500">+{sessionDates.length - 6} more</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HoverEvidenceCard({
  title,
  subtitle,
  evidence,
  active,
  placement = 'below',
}: {
  title: string;
  subtitle: string;
  evidence: string[];
  active: boolean;
  placement?: 'above' | 'below';
}) {
  if (!evidence.length || !active) return null;

  return (
    <div
      className={`absolute z-20 max-h-44 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5 text-left shadow-xl ${
        placement === 'above'
          ? 'bottom-full right-0 mb-2'
          : placement === 'overlay'
          ? 'inset-x-2 top-2 w-auto'
          : 'top-full right-0 mt-2'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 border-b border-slate-200 pb-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</div>
        <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div>
      </div>
      <div className="space-y-1.5">
        {evidence.map((item, index) => {
          const pipeParts = item.split(' | ');
          const hasPipeFormat = pipeParts.length > 1;
          const parts = hasPipeFormat ? pipeParts : item.split(' - ');
          const datePart = parts.length > 1 ? parts[parts.length - 1] : '';
          const textPart = parts.length > 1 ? parts.slice(0, -1).join(hasPipeFormat ? ' | ' : ' - ') : item;

          return (
            <div key={`${item}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5">
              <div className="text-[10px] font-semibold leading-4 text-slate-800">{textPart}</div>
              {datePart ? <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{datePart}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComplianceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: any }> }) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;

  const data = payload[0].payload;
  const sessionDates = Array.isArray(data.sessionDates) ? data.sessionDates : [];

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    >
      <div className="mb-1 font-semibold text-gray-900">{data.name}</div>
      <div className="mb-2 text-[11px] text-gray-500">
        {data.pct ?? 0}% ({data.value ?? 0})
      </div>
      {sessionDates.length > 0 ? (
        <div className="space-y-1 text-gray-700">
          {sessionDates.slice(0, 6).map((sessionDate: string) => (
            <div key={sessionDate}>{sessionDate}</div>
          ))}
          {sessionDates.length > 6 ? <div className="text-[11px] text-gray-500">+{sessionDates.length - 6} more</div> : null}
        </div>
      ) : (
        <div className="text-gray-500">No lecture dates available</div>
      )}
    </div>
  );
}

function AttendanceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: any }> }) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;

  const data = payload[0].payload;
  const sessionDates = Array.isArray(data.sessionDates) ? data.sessionDates : [];

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    >
      <div className="mb-1 font-semibold text-gray-900">{data.name}</div>
      <div className="mb-2 text-[11px] text-gray-500">
        {data.pct ?? 0}% ({data.value ?? 0})
      </div>
      {sessionDates.length > 0 ? (
        <div className="space-y-1 text-gray-700">
          {sessionDates.slice(0, 6).map((sessionDate: string) => (
            <div key={sessionDate}>{sessionDate}</div>
          ))}
          {sessionDates.length > 6 ? <div className="text-[11px] text-gray-500">+{sessionDates.length - 6} more</div> : null}
        </div>
      ) : (
        <div className="text-gray-500">No lecture dates available</div>
      )}
    </div>
  );
}

function OtjTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: any }> }) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;

  const data = payload[0].payload;
  const learners = Array.isArray(data.learners) ? data.learners : [];

  return (
    <div
      className="w-64 max-w-[18rem] rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-xl"
      style={{ boxShadow: '0 10px 24px rgba(15,23,42,0.12)' }}
    >
      <div className="break-words text-[13px] font-semibold text-slate-900">{data.name}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">
        {data.pct ?? 0}% ({data.value ?? 0})
      </div>
      {learners.length > 0 ? (
        <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-600">
          {learners.slice(0, 6).map((learner: string) => (
            <div key={learner} className="break-words">{learner}</div>
          ))}
          {learners.length > 6 ? <div className="pt-0.5 text-[11px] text-slate-400">+{learners.length - 6} more</div> : null}
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-slate-400">No learner details available</div>
      )}
    </div>
  );
}

export default function ProgressReviewPage() {
  const location = useLocation();
  const isChecklistMatrixPage = location.pathname === '/checklist-matrix';
  const apiBaseRaw = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const apiBase = apiBaseRaw.endsWith('/api/v1')
    ? apiBaseRaw
    : `${apiBaseRaw.replace(/\/$/, '')}/api/v1`;

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [sessionReportLoading, setSessionReportLoading] = useState(false);
  const [sessionReportError, setSessionReportError] = useState<string | null>(null);
  const [sessionReportText, setSessionReportText] = useState('');
  const [sessionReportMeta, setSessionReportMeta] = useState<{
    totalSessions: number;
    uniqueLearners: number;
    uniqueCoaches: number;
    compliance: number;
  } | null>(null);
  const [showSessionReportModal, setShowSessionReportModal] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportCoachFilter, setReportCoachFilter] = useState<string>('');
  const [dashboardCoachFilter, setDashboardCoachFilter] = useState('');
  const [dashboardDatePreset, setDashboardDatePreset] = useState<DashboardDatePreset>('ALL');
  const [dashboardDateFrom, setDashboardDateFrom] = useState('');
  const [dashboardDateTo, setDashboardDateTo] = useState('');
  const [activeRagPopup, setActiveRagPopup] = useState<RAGTooltipItem | null>(null);
  const [activeChecklistPopup, setActiveChecklistPopup] = useState<CompliancePopupItem | null>(null);
  const [activeManagerAttendancePopup, setActiveManagerAttendancePopup] = useState<ManagerAttendancePopupItem | null>(null);
  const [activeChecklistCellEvidence, setActiveChecklistCellEvidence] = useState<ChecklistCellEvidenceItem | null>(null);
  const [openEvidenceKey, setOpenEvidenceKey] = useState<string | null>(null);
  const [tableFilters, setTableFilters] = useState({
    learnerSearch: '',
    reviewDate: '',
    coach: '',
    programme: '',
    group: '',
    contactStatus: '' as ContactOutcome | '',
    status: '' as ReviewStatus | '',
  });
  const [dueDatePopup, setDueDatePopup] = useState<{ reviewId: string } | null>(null);
  const [contactUpdates, setContactUpdates] = useState<Record<string, { outcome: ContactOutcome; reason: string }>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(CONTACT_UPDATES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [openContactDropdownId, setOpenContactDropdownId] = useState<string | null>(null);
  const [logoIndex, setLogoIndex] = useState(0);
  const logoSources = ['https://kentbusinesscollege.com/wp-content/uploads/2025/12/header-logo-e1756282001779.png'];
  const logoLoadFailed = logoIndex >= logoSources.length;
  const reportLogoSrc = logoSources[0];

  const normalizeAptimText = (value: string) =>
    value.replace(/\b(?:aptin|aptim|aptem|uptem)\b/gi, 'aptem');

  const buildFallbackPhone = (review: ReviewRecord, index: number) => {
    const numericId = review.learner.id.replace(/\D/g, '').padStart(3, '0').slice(-3);
    return `07700 91${String(index + 1).padStart(2, '0')}${numericId}`;
  };

  const getDisplayedPhone = (review: ReviewRecord, index: number) =>
    review.learner.phone && review.learner.phone.trim() ? review.learner.phone : buildFallbackPhone(review, index);

  const formatPhoneForCell = (phone: string) => {
    const normalized = phone.replace(/\s+/g, '');
    return {
      firstLine: normalized,
      secondLine: '',
    };
  };

  const formatEmailAtBreak = (email: string) => {
    const normalized = (email || '').trim();
    if (!normalized || !normalized.includes('@')) {
      return { local: normalized || '-', domain: '' };
    }
    const [localPart, domainPart] = normalized.split(/@(.+)/, 2);
    return {
      local: localPart || '-',
      domain: domainPart ? `@${domainPart}` : '',
    };
  };

  const formatLearnerNameAtBreak = (name: string) => {
    const normalized = (name || '').trim();
    if (!normalized || !normalized.includes('@')) {
      return { firstLine: normalized || '-', secondLine: '' };
    }
    const [firstPart, secondPart] = normalized.split(/@(.+)/, 2);
    return {
      firstLine: firstPart || '-',
      secondLine: secondPart ? `@${secondPart}` : '',
    };
  };

  const formatDateForCell = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { firstLine: '-', secondLine: '' };
    return {
      firstLine: format(date, 'dd MMM'),
      secondLine: format(date, 'yyyy'),
    };
  };

  const formatProgrammeForCell = (programme: string) => {
    const parts = programme
      .split(' - ')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length > 1) {
      return parts;
    }

    const words = programme.split(' ').filter(Boolean);
    if (words.length <= 3) return [programme];

    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
  };

  const contactOutcomeLabels: Record<ContactOutcome, string> = {
    NONE: 'Select status',
    NO_ANSWER: 'No answer',
    CONFIRMED_BOOKING: 'Booking confirmed',
    CALL_BACK_REQUESTED: 'Call back requested',
  };

  const sanitizeReviewTextFields = (review: ReviewRecord): ReviewRecord => ({
    ...review,
    learner: {
      ...review.learner,
      phone: review.learner.phone || '',
    },
    contactOutcome: review.contactOutcome || 'NONE',
    contactReason: review.contactReason || '',
    overallJudgement: normalizeAptimText(review.overallJudgement || ''),
    reportText: review.reportText ? normalizeAptimText(review.reportText) : review.reportText,
    riskNotes: normalizeAptimText(review.riskNotes || ''),
    strengths: (review.strengths || []).map((s) => normalizeAptimText(s)),
    areasForDevelopment: (review.areasForDevelopment || []).map((s) => normalizeAptimText(s)),
    actions: (review.actions || []).map((a) => ({
      ...a,
      action: normalizeAptimText(a.action || ''),
    })),
    checklist: (review.checklist || []).map((c) => ({
      ...c,
      comments: normalizeAptimText(c.comments || ''),
    })),
  });

  const clearFilters = () => {
    setTableFilters({
      learnerSearch: '',
      reviewDate: '',
      coach: '',
      programme: '',
      group: '',
      contactStatus: '',
      status: '',
    });
  };

  const clearDashboardFilters = () => {
    setDashboardCoachFilter('');
    setDashboardDatePreset('ALL');
    setDashboardDateFrom('');
    setDashboardDateTo('');
  };

  const getEffectiveContactOutcome = (review: ReviewRecord): ContactOutcome =>
    contactUpdates[review.id]?.outcome || review.contactOutcome || 'NONE';

  const updateContactOutcome = (reviewId: string, outcome: ContactOutcome) => {
    setContactUpdates((current) => ({
      ...current,
      [reviewId]: {
        outcome,
        reason: outcome === 'NO_ANSWER' ? current[reviewId]?.reason || '' : '',
      },
    }));
    setOpenContactDropdownId(null);
  };

  const updateContactReason = (reviewId: string, reason: string) => {
    setContactUpdates((current) => ({
      ...current,
      [reviewId]: {
        outcome: current[reviewId]?.outcome || 'NO_ANSWER',
        reason,
      },
    }));
  };

  const renderContactUpdateControl = (review: ReviewRecord, selectedOutcome: ContactOutcome, selectedReason: string) => (
    <div className="space-y-1.5">
      <div className="relative" onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenContactDropdownId((current) => current === review.id ? null : review.id)}
          className="flex min-h-10 w-full min-w-[104px] items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2.5 text-left text-[13px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
        >
          <span className="truncate">{contactOutcomeLabels[selectedOutcome]}</span>
          <i className={`ri-arrow-down-s-line ml-3 shrink-0 text-xl text-slate-400 transition-transform ${openContactDropdownId === review.id ? 'rotate-180' : ''}`}></i>
        </button>
        {openContactDropdownId === review.id && (
          <div className="absolute right-0 top-full z-30 mt-1.5 w-max min-w-full max-w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {Object.entries(contactOutcomeLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => updateContactOutcome(review.id, value as ContactOutcome)}
                className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-cyan-50 ${
                  selectedOutcome === value ? 'bg-cyan-600 text-white hover:bg-cyan-600' : 'text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedOutcome === 'NO_ANSWER' && (
        <input
          type="text"
          value={selectedReason}
          onChange={(e) => updateContactReason(review.id, e.target.value)}
          placeholder="Reason for no answer"
          className="block w-full min-w-[104px] max-w-full rounded-xl border border-cyan-200 bg-cyan-50/40 px-3 py-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 shadow-sm transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 focus:outline-none"
        />
      )}
    </div>
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    fetch(`${apiBase}/progress-reviews/overview?limit=all`)
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Failed to load reviews');
        }
        return res.json() as Promise<ProgressReviewsOverviewResponse>;
      })
      .then((data) => {
        if (!active) return;
        const normalized = Array.isArray(data.reviews)
          ? data.reviews.map((r) => sanitizeReviewTextFields(r))
          : [];
        setReviews(normalized);
      })
      .catch((err: Error) => {
        if (!active) return;
        setLoadError(err.message || 'Failed to load reviews');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiBase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CONTACT_UPDATES_STORAGE_KEY, JSON.stringify(contactUpdates));
  }, [contactUpdates]);

  useEffect(() => {
    const handlePointerDown = () => setOpenContactDropdownId(null);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const matchesFilters = (
    review: ReviewRecord,
    activeFilters: typeof tableFilters,
    ignore: '' | 'learnerSearch' | 'reviewDate' | 'coach' | 'programme' | 'group' | 'contactStatus' | 'status' = ''
  ) => {
    if (
      ignore !== 'learnerSearch' &&
      activeFilters.learnerSearch &&
      !review.learner.name.toLowerCase().includes(activeFilters.learnerSearch.toLowerCase().trim())
    ) {
      return false;
    }
    if (ignore !== 'reviewDate' && activeFilters.reviewDate) {
      const reviewDate = review.lastReviewDate?.slice(0, 10);
      if (reviewDate !== activeFilters.reviewDate) return false;
    }
    if (ignore !== 'coach' && activeFilters.coach && review.coach.name !== activeFilters.coach) return false;
    if (ignore !== 'programme' && activeFilters.programme && review.programme !== activeFilters.programme) return false;
    if (ignore !== 'group' && activeFilters.group && review.group !== activeFilters.group) return false;
    if (
      ignore !== 'contactStatus' &&
      activeFilters.contactStatus &&
      getEffectiveContactOutcome(review) !== activeFilters.contactStatus
    ) return false;
    if (ignore !== 'status' && activeFilters.status && review.status !== activeFilters.status) return false;
    return true;
  };

  const dashboardReviews = useMemo(
    () => {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const startOfDay = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date;
      };

      const reviewMatchesDate = (review: ReviewRecord) => {
        const sourceDate = new Date(review.meetingDate || review.lastReviewDate);
        if (Number.isNaN(sourceDate.getTime())) return false;

        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = endOfToday;

        if (dashboardDatePreset === 'LAST_MONTH') {
          rangeStart = new Date(endOfToday);
          rangeStart.setMonth(rangeStart.getMonth() - 1);
          rangeStart.setHours(0, 0, 0, 0);
        } else if (dashboardDatePreset === 'LAST_3_MONTHS') {
          rangeStart = new Date(endOfToday);
          rangeStart.setMonth(rangeStart.getMonth() - 3);
          rangeStart.setHours(0, 0, 0, 0);
        } else if (dashboardDatePreset === 'CUSTOM') {
          rangeStart = dashboardDateFrom ? startOfDay(dashboardDateFrom) : null;
          rangeEnd = dashboardDateTo ? startOfDay(dashboardDateTo) : endOfToday;
          if (rangeEnd) {
            rangeEnd.setHours(23, 59, 59, 999);
          }
          if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
            const swappedStart = new Date(rangeEnd);
            swappedStart.setHours(0, 0, 0, 0);
            const swappedEnd = new Date(rangeStart);
            swappedEnd.setHours(23, 59, 59, 999);
            rangeStart = swappedStart;
            rangeEnd = swappedEnd;
          }
        }

        if (rangeStart && sourceDate < rangeStart) return false;
        if (rangeEnd && sourceDate > rangeEnd) return false;
        return true;
      };

      return reviews.filter((review) => {
        if (dashboardCoachFilter && review.coach.name !== dashboardCoachFilter) return false;
        return reviewMatchesDate(review);
      });
    },
    [reviews, dashboardCoachFilter, dashboardDatePreset, dashboardDateFrom, dashboardDateTo]
  );

  const filteredReviews = useMemo(
    () => dashboardReviews.filter((review) => matchesFilters(review, tableFilters)),
    [tableFilters, dashboardReviews]
  );
  const displayedReviews = useMemo(
    () => (isChecklistMatrixPage ? filteredReviews : filteredReviews.slice(0, 5)),
    [filteredReviews, isChecklistMatrixPage]
  );
  const shouldScrollReviews = isChecklistMatrixPage && displayedReviews.length > 10;

  const chartReviews = useMemo(
    () =>
      filteredReviews.filter((review) => {
        const reviewDate = new Date(review.lastReviewDate);
        return !Number.isNaN(reviewDate.getTime());
      }),
    [filteredReviews]
  );

  const getNextCycleStatus = (review: ReviewRecord): ReviewStatus | null => {
    return review.nextReviewStatus ?? null;
  };

  const kpis = useMemo(() => {
    const totalLearners = new Set(dashboardReviews.map((r) => r.learner.id)).size;
    const reviewsCompleted = dashboardReviews.filter((r) => r.status === 'COMPLETED').length;
    const booking = dashboardReviews.filter((r) => getNextCycleStatus(r) === 'BOOKING').length;
    const atRisk = dashboardReviews.filter((r) => getNextCycleStatus(r) === 'AT_RISK').length;
    const overdue = dashboardReviews.filter((r) => getNextCycleStatus(r) === 'OVERDUE').length;
    const allPresentCount = dashboardReviews.filter((r) => r.attendance === 'ALL_PRESENT').length;
    const attendanceCompliance =
      dashboardReviews.length > 0
        ? Math.round((allPresentCount / dashboardReviews.length) * 100)
        : 0;
    return { totalLearners, reviewsCompleted, booking, atRisk, overdue, attendanceCompliance };
  }, [dashboardReviews]);

  const weeklyStatusTrend = useMemo(() => {
    const monthlyLectureCounts = new Map<string, number>();
    chartReviews.forEach((review) => {
      const sourceDate = new Date(review.meetingDate || review.lastReviewDate);
      if (Number.isNaN(sourceDate.getTime())) return;
      const monthKey = format(sourceDate, 'yyyy-MM');
      monthlyLectureCounts.set(monthKey, (monthlyLectureCounts.get(monthKey) || 0) + 1);
    });

    const buckets = new Map<string, {
      weekStart: Date;
      label: string;
      weekRangeLabel: string;
      monthLabel: string;
      monthLectureCount: number;
      completed: number;
      booking: number;
      atRisk: number;
      overdue: number;
      total: number;
      sessionDates: string[];
    }>();

    for (const review of chartReviews) {
      const sessionDateRaw = review.meetingDate || review.lastReviewDate;
      const reviewDate = new Date(sessionDateRaw);
      if (Number.isNaN(reviewDate.getTime())) continue;
      const weekStart = new Date(reviewDate);
      weekStart.setDate(reviewDate.getDate() - reviewDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const key = weekStart.toISOString().slice(0, 10);
      const monthKey = format(reviewDate, 'yyyy-MM');
      if (!buckets.has(key)) {
        buckets.set(key, {
          weekStart,
          label: format(weekStart, 'dd MMM'),
          weekRangeLabel: `${format(weekStart, 'dd MMM yyyy')} - ${format(weekEnd, 'dd MMM yyyy')}`,
          monthLabel: format(reviewDate, 'MMMM yyyy'),
          monthLectureCount: monthlyLectureCounts.get(monthKey) || 0,
          completed: 0,
          booking: 0,
          atRisk: 0,
          overdue: 0,
          total: 0,
          sessionDates: [],
        });
      }

      const bucket = buckets.get(key)!;
      bucket.total += 1;
      const formattedSessionDate = format(reviewDate, 'dd MMM yyyy');
      if (!bucket.sessionDates.includes(formattedSessionDate)) {
        bucket.sessionDates.push(formattedSessionDate);
        bucket.sessionDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      }
      const nextCycleStatus = getNextCycleStatus(review);
      if (review.status === 'COMPLETED') bucket.completed += 1;
      if (nextCycleStatus === 'BOOKING') bucket.booking += 1;
      if (nextCycleStatus === 'AT_RISK') bucket.atRisk += 1;
      if (nextCycleStatus === 'OVERDUE') bucket.overdue += 1;
    }

    const data = Array.from(buckets.values())
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .slice(-12);

    if (data.length === 0) {
      return [{
        weekStart: new Date(),
        label: format(new Date(), 'dd MMM'),
        weekRangeLabel: format(new Date(), 'dd MMM yyyy'),
        monthLabel: format(new Date(), 'MMMM yyyy'),
        monthLectureCount: 0,
        completed: 0,
        booking: 0,
        atRisk: 0,
        overdue: 0,
        total: 0,
        sessionDates: [],
      }];
    }

    return data;
  }, [chartReviews]);

  const complianceData = useMemo(() => {
    const buildChecklistEvidence = (evaluation: ChecklistStatus) => {
      const rows: Array<{ criterion: string; meetingDate: string; coachName: string }> = [];
      chartReviews.forEach((review) => {
        const sessionDate = new Date(review.meetingDate || review.lastReviewDate);
        const formattedDate = Number.isNaN(sessionDate.getTime()) ? 'Unknown date' : format(sessionDate, 'dd MMM yyyy');
        review.checklist.forEach((item) => {
          if (item.evaluation !== evaluation) return;
          rows.push({
            criterion: item.category || 'Checklist item',
            meetingDate: formattedDate,
            coachName: review.coach.name || 'Unknown Coach',
          });
        });
      });
      return rows;
    };

    const yesCount = chartReviews.reduce((sum, r) => sum + r.checklist.filter((c) => c.evaluation === 'YES').length, 0);
    const partialCount = chartReviews.reduce((sum, r) => sum + r.checklist.filter((c) => c.evaluation === 'PARTIAL').length, 0);
    const noCount = chartReviews.reduce((sum, r) => sum + r.checklist.filter((c) => c.evaluation === 'NO').length, 0);

    return [
      { name: 'Yes', value: yesCount, color: COMPLIANCE_COLORS.yes, evidence: buildChecklistEvidence('YES') },
      { name: 'Partial', value: partialCount, color: COMPLIANCE_COLORS.partial, evidence: buildChecklistEvidence('PARTIAL') },
      { name: 'No', value: noCount, color: COMPLIANCE_COLORS.no, evidence: buildChecklistEvidence('NO') },
    ];
  }, [chartReviews]);

  const complianceTotal = useMemo(
    () => complianceData.reduce((sum, item) => sum + item.value, 0),
    [complianceData]
  );

  const complianceBreakdown = useMemo(
    () =>
      complianceData.map((item) => ({
        ...item,
        pct: complianceTotal > 0 ? Math.round((item.value / complianceTotal) * 100) : 0,
      })),
    [complianceData, complianceTotal]
  );

  const attendanceBreakdown = useMemo(() => {
    const counts = chartReviews.reduce(
      (acc, review) => {
        if (review.attendance === 'ALL_PRESENT') acc.allPresent += 1;
        else if (review.attendance === 'PARTIAL') acc.partial += 1;
        else acc.missing += 1;
        return acc;
      },
      { allPresent: 0, partial: 0, missing: 0 }
    );

    const buildAttendanceEvidence = (attendance: ReviewRecord['attendance']) => {
      const rows: string[] = [];
      chartReviews.forEach((review) => {
        if (review.attendance !== attendance) return;
        const sessionDate = new Date(review.meetingDate || review.lastReviewDate);
        const formattedDate = Number.isNaN(sessionDate.getTime()) ? 'Unknown date' : format(sessionDate, 'dd MMM yyyy');
        const employerLabel = (review.employer?.name || '').trim().toLowerCase();
        const employerMissing = !employerLabel;
        const employerMarkedAbsent =
          employerLabel.includes("didn't attend") ||
          employerLabel.includes('didnâ€™t attend') ||
          employerLabel.includes('did not attend') ||
          employerLabel.includes('not attend');
        const managerPresent = !employerMissing && !employerMarkedAbsent && review.attendance === 'ALL_PRESENT';
        rows.push(`${formattedDate} | ${managerPresent ? 'Manager present' : 'Manager not present'}`);
      });
      return rows;
    };

    const total = counts.allPresent + counts.partial + counts.missing;
    return [
      {
        name: 'All Present',
        value: counts.allPresent,
        color: STATUS_COLORS.completed,
        pct: total > 0 ? Math.round((counts.allPresent / total) * 100) : 0,
        sessionDates: buildAttendanceEvidence('ALL_PRESENT'),
      },
      {
        name: 'Partial',
        value: counts.partial,
        color: COMPLIANCE_COLORS.partial,
        pct: total > 0 ? Math.round((counts.partial / total) * 100) : 0,
        sessionDates: buildAttendanceEvidence('PARTIAL'),
      },
      {
        name: 'Missing',
        value: counts.missing,
        color: COMPLIANCE_COLORS.no,
        pct: total > 0 ? Math.round((counts.missing / total) * 100) : 0,
        sessionDates: buildAttendanceEvidence('MISSING'),
      },
    ];
  }, [chartReviews]);

  const activeAttendanceEvidence = useMemo(
    () => attendanceBreakdown.find((item) => openEvidenceKey === `attendance-${item.name}`) ?? null,
    [attendanceBreakdown, openEvidenceKey]
  );

  const otjBreakdown = useMemo(() => {
    const counts = {
      ahead: 0,
      atRisk: 0,
      behind: 0,
      needAttention: 0,
    };

    const learnersByStatus = {
      ahead: [] as string[],
      atRisk: [] as string[],
      behind: [] as string[],
      needAttention: [] as string[],
    };

    chartReviews.forEach((review) => {
      const normalized = (review.otjHoursStatus || '').trim().toLowerCase();
      const learnerName = review.learner.name || 'Unknown learner';

      if (normalized === 'ahead') {
        counts.ahead += 1;
        learnersByStatus.ahead.push(learnerName);
      } else if (normalized === 'at risk') {
        counts.atRisk += 1;
        learnersByStatus.atRisk.push(learnerName);
      } else if (normalized === 'behind') {
        counts.behind += 1;
        learnersByStatus.behind.push(learnerName);
      } else if (normalized === 'need attention') {
        counts.needAttention += 1;
        learnersByStatus.needAttention.push(learnerName);
      }
    });

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);

    return [
      { name: 'Ahead', value: counts.ahead, color: OTJ_COLORS.ahead, pct: total > 0 ? Math.round((counts.ahead / total) * 100) : 0, learners: learnersByStatus.ahead },
      { name: 'At risk', value: counts.atRisk, color: OTJ_COLORS.atRisk, pct: total > 0 ? Math.round((counts.atRisk / total) * 100) : 0, learners: learnersByStatus.atRisk },
      { name: 'Behind', value: counts.behind, color: OTJ_COLORS.behind, pct: total > 0 ? Math.round((counts.behind / total) * 100) : 0, learners: learnersByStatus.behind },
      { name: 'Need attention', value: counts.needAttention, color: OTJ_COLORS.needAttention, pct: total > 0 ? Math.round((counts.needAttention / total) * 100) : 0, learners: learnersByStatus.needAttention },
    ].filter((item) => item.value > 0);
  }, [chartReviews]);

  const upcomingPlannedReviews = useMemo(() => {
    return [...dashboardReviews]
      .filter((review) => {
        const dueDate = new Date(review.nextDueDate);
        if (Number.isNaN(dueDate.getTime())) return false;
        return getNextCycleStatus(review) !== 'BOOKING';
      })
      .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());
  }, [dashboardReviews]);

  const ownerWorkload = useMemo(() => {
    const owners = new Map<
      string,
      {
        owner: string;
        total: number;
        completed: number;
        booking: number;
        atRisk: number;
        overdue: number;
        lectures: ReviewRecord[];
      }
    >();

    dashboardReviews.forEach((review) => {
      const owner = review.coach.name || 'Unknown Coach';
      if (!owners.has(owner)) {
        owners.set(owner, { owner, total: 0, completed: 0, booking: 0, atRisk: 0, overdue: 0, lectures: [] });
      }
      const current = owners.get(owner)!;
      const nextCycleStatus = getNextCycleStatus(review);
      current.total += 1;
      current.lectures.push(review);
      if (review.status === 'COMPLETED') current.completed += 1;
      if (nextCycleStatus === 'BOOKING') current.booking += 1;
      if (nextCycleStatus === 'AT_RISK') current.atRisk += 1;
      if (nextCycleStatus === 'OVERDUE') current.overdue += 1;
    });

    return Array.from(owners.values())
      .map((owner) => ({
        ...owner,
        lectures: owner.lectures.sort((a, b) => {
          const dateA = new Date(a.meetingDate || a.lastReviewDate).getTime();
          const dateB = new Date(b.meetingDate || b.lastReviewDate).getTime();
          return dateB - dateA;
        }),
      }))
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.owner.localeCompare(b.owner);
      })
      .slice(0, 6);
  }, [dashboardReviews]);

  const coaches = useMemo(
    () =>
      Array.from(new Set(dashboardReviews.filter((r) => matchesFilters(r, tableFilters, 'coach')).map((r) => r.coach.name))).sort(),
    [dashboardReviews, tableFilters]
  );

  const programmes = useMemo(
    () =>
      Array.from(
        new Set(dashboardReviews.filter((r) => matchesFilters(r, tableFilters, 'programme')).map((r) => r.programme))
      ).sort(),
    [dashboardReviews, tableFilters]
  );

  const groups = useMemo(
    () =>
      Array.from(new Set(dashboardReviews.filter((r) => matchesFilters(r, tableFilters, 'group')).map((r) => r.group))).sort(),
    [dashboardReviews, tableFilters]
  );

  const learners = useMemo(() => {
    const seen = new Set<string>();
    return dashboardReviews
      .filter((r) => matchesFilters(r, tableFilters, 'learnerSearch'))
      .map((r) => r.learner)
      .filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dashboardReviews, tableFilters]);

  const reportSessions = useMemo(
    () =>
      [...reviews].sort(
        (a, b) => new Date(b.lastReviewDate).getTime() - new Date(a.lastReviewDate).getTime()
      ),
    [reviews]
  );

  const reportCoachOptions = useMemo(
    () => Array.from(new Set(reportSessions.map((r) => r.coach.name || 'Unknown Coach'))).sort(),
    [reportSessions]
  );

  const coachFilteredReportSessions = useMemo(
    () =>
      !reportCoachFilter
        ? []
        : reportSessions.filter((r) => (r.coach.name || 'Unknown Coach') === reportCoachFilter),
    [reportSessions, reportCoachFilter]
  );

  const activeReportReview = useMemo(() => {
    if (!coachFilteredReportSessions.length || !activeReportId) return null;
    return coachFilteredReportSessions.find((r) => r.id === activeReportId) || null;
  }, [coachFilteredReportSessions, activeReportId]);

  const activePrintableRating = useMemo(() => {
    if (!activeReportReview) return { rag: '-', score: '-' };
    const cleanText = (value: string) => normalizeAptimText(value || '').replace(/\s+/g, ' ').trim();
    const parseJsonLikeObject = (raw: string): Record<string, any> | null => {
      const text = (raw || '').trim();
      if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null;
      try {
        const parsed = JSON.parse(text) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, any>;
        if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object') return parsed[0] as Record<string, any>;
      } catch {
        const normalized = text
          .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*?)'/g, ': "$1"');
        try {
          const parsed = JSON.parse(normalized) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, any>;
          if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object') return parsed[0] as Record<string, any>;
        } catch {
          return null;
        }
      }
      return null;
    };
    const base =
      activeReportReview.status === 'COMPLETED'
        ? 'Completed'
        : activeReportReview.status === 'BOOKING'
        ? 'Booking'
        : activeReportReview.status === 'AT_RISK'
        ? 'Amber'
        : 'Red';
    const rawCandidates = [
      activeReportReview.overallRating || '',
      activeReportReview.reportText || '',
      activeReportReview.overallJudgement || '',
    ];

    for (const raw of rawCandidates) {
      const parsed = parseJsonLikeObject(raw);
      if (!parsed) continue;

      const rag =
        (typeof parsed.rag === 'string' && parsed.rag.trim()) ||
        (typeof parsed.status === 'string' && parsed.status.trim()) ||
        base;
      const avgRaw = parsed.average_rating ?? parsed.averageRating ?? '';
      const avgText = typeof avgRaw === 'number' || typeof avgRaw === 'string' ? String(avgRaw).trim() : '';

      if (avgText) {
        return { rag: cleanText(rag), score: `${avgText}/5` };
      }

      return {
        rag: cleanText(rag),
        score: cleanText(activeReportReview.overallRating || '-') || '-',
      };
    }

    return {
      rag: base,
      score: cleanText(activeReportReview.overallRating || '-') || '-',
    };
  }, [activeReportReview]);

  const reportMetaComputed = useMemo(() => {
    const source = coachFilteredReportSessions;
    const totalSessions = source.length;
    const uniqueLearners = new Set(source.map((r) => r.learner.id)).size;
    const uniqueCoaches = new Set(source.map((r) => r.coach.name || 'Unknown Coach')).size;
    const checklist = source.flatMap((r) => r.checklist || []);
    const yes = checklist.filter((c) => c.evaluation === 'YES').length;
    const partial = checklist.filter((c) => c.evaluation === 'PARTIAL').length;
    const totalChecklist = checklist.length;
    const compliance = totalChecklist > 0 ? Math.round(((yes + partial * 0.5) / totalChecklist) * 100) : 0;
    return { totalSessions, uniqueLearners, uniqueCoaches, compliance };
  }, [coachFilteredReportSessions]);

  const reportLearnerOptions = useMemo(() => {
    const byLearner = new Map<string, { id: string; name: string }>();
    for (const session of coachFilteredReportSessions) {
      const learnerId = session.learner.id || session.id;
      if (!byLearner.has(learnerId)) {
        byLearner.set(learnerId, {
          id: session.id,
          name: session.learner.name || 'Unknown Learner',
        });
      }
    }
    return Array.from(byLearner.values());
  }, [coachFilteredReportSessions]);

  const getQaCriteriaRows = (review: ReviewRecord) => {
    const checklist = Array.isArray(review.checklist) ? review.checklist : [];
    const employerPresent = hasMeaningfulEmployer(review);

    return checklist.map((item) => {
      const category = item.category || '-';
      const normalizedCategory = category.toLowerCase();
      const isAttendanceRow =
        normalizedCategory.includes('attendance') ||
        normalizedCategory.includes('all parties present') ||
        normalizedCategory.includes('learner, employer, and skill coach');

      if (isAttendanceRow) {
        const allThreePresent = review.attendance === 'ALL_PRESENT' && employerPresent;
        const partialAttendance = review.attendance === 'PARTIAL' || !employerPresent;

        return {
          category,
          evaluation: allThreePresent ? 'YES' : partialAttendance ? 'PARTIAL' : 'NO',
          comments: allThreePresent
            ? 'Learner, employer, and skills coach are all recorded as present in the session data.'
            : partialAttendance
            ? 'Session data indicates partial attendance or missing employer attendance.'
            : 'Session data indicates that all required parties were not present.',
        };
      }

      return {
        category,
        evaluation: item.evaluation || 'NO',
        comments: item.comments || '',
      };
    });
  };

  const qaEvalLabel = (evaluation: string) =>
    evaluation === 'YES' ? 'Yes' : evaluation === 'PARTIAL' ? 'Partial' : 'No';
  const qaEvalClasses = (evaluation: string) =>
    evaluation === 'YES'
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : evaluation === 'PARTIAL'
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-rose-100 text-rose-700 border-rose-200';
  const qaEvalIcon = (evaluation: string) =>
    evaluation === 'YES' ? 'ri-check-line' : evaluation === 'PARTIAL' ? 'ri-subtract-line' : 'ri-close-line';
  const qaEvalSymbol = (evaluation: string) =>
    evaluation === 'YES' ? 'Yes' : evaluation === 'PARTIAL' ? '-' : 'No';

  function getOverallRatingRag(review: ReviewRecord): 'green' | 'amber' | 'red' {
    const candidates = [
      review.overallRating || '',
      review.reportText || '',
      review.overallJudgement || '',
    ];

    for (const candidate of candidates) {
      const text = String(candidate || '').trim().toLowerCase();
      if (!text) continue;

      if (text.includes('"rag"') || text.includes("'rag'")) {
        const match = text.match(/["']rag["']\s*:\s*["'](green|amber|red)["']/i);
        if (match?.[1]) {
          return match[1].toLowerCase() as 'green' | 'amber' | 'red';
        }
      }

      if (text.startsWith('green') || text.includes('| green |') || text.includes('green |')) return 'green';
      if (text.startsWith('amber') || text.includes('| amber |') || text.includes('amber |')) return 'amber';
      if (text.startsWith('red') || text.includes('| red |') || text.includes('red |')) return 'red';
    }

    if (review.status === 'OVERDUE') return 'red';
    if (review.status === 'COMPLETED') return 'green';
    return 'amber';
  }

  const ragStatusDistribution = useMemo(() => {
    const counts = { green: 0, amber: 0, red: 0 };
    const sessionsByRag = {
      green: [] as RAGTooltipSession[],
      amber: [] as RAGTooltipSession[],
      red: [] as RAGTooltipSession[],
    };
    chartReviews.forEach((review) => {
      const rag = getOverallRatingRag(review);
      counts[rag] += 1;

      const rawDate = review.meetingDate || review.lastReviewDate || '';
      const parsedDate = rawDate ? new Date(rawDate) : null;
      sessionsByRag[rag].push({
        learnerName: review.learner.name || 'Unknown Learner',
        meetingDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? format(parsedDate, 'dd MMM yyyy') : '-',
      });
    });

    const total = counts.green + counts.amber + counts.red;
    return {
      total,
      items: [
        {
          name: 'Green',
          value: counts.green,
          pct: total ? Number(((counts.green / total) * 100).toFixed(1)) : 0,
          color: '#19c18d',
          tone: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
          sessions: sessionsByRag.green,
          extraCount: 0,
        },
        {
          name: 'Amber',
          value: counts.amber,
          pct: total ? Number(((counts.amber / total) * 100).toFixed(1)) : 0,
          color: '#f59e0b',
          tone: 'border-amber-200 bg-amber-50/70 text-amber-900',
          sessions: sessionsByRag.amber,
          extraCount: 0,
        },
        {
          name: 'Red',
          value: counts.red,
          pct: total ? Number(((counts.red / total) * 100).toFixed(1)) : 0,
          color: '#f45267',
          tone: 'border-rose-200 bg-rose-50/70 text-rose-900',
          sessions: sessionsByRag.red,
          extraCount: 0,
        },
      ],
    };
  }, [chartReviews]);

  const monthlyVolumeData = useMemo(() => {
    const byMonth = new Map<string, { label: string; count: number }>();

    chartReviews.forEach((review) => {
      const reviewDate = new Date(review.meetingDate || review.lastReviewDate);
      if (Number.isNaN(reviewDate.getTime())) return;
      const key = format(reviewDate, 'yyyy-MM');
      if (!byMonth.has(key)) {
        byMonth.set(key, { label: format(reviewDate, 'MMM'), count: 0 });
      }
      byMonth.get(key)!.count += 1;
    });

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [chartReviews]);

  const monthlyVolumeStats = useMemo(() => {
    const total = monthlyVolumeData.reduce((sum, item) => sum + item.count, 0);
    const peak = monthlyVolumeData.reduce((max, item) => Math.max(max, item.count), 0);
    const average = monthlyVolumeData.length ? total / monthlyVolumeData.length : 0;
    return {
      total,
      peak,
      average: Number(average.toFixed(1)),
    };
  }, [monthlyVolumeData]);

  const dataQualitySummary = useMemo(() => {
    const total = dashboardReviews.length;
    if (!total) {
      return {
        score: 0,
        label: 'No data',
        tone: 'border-slate-200 bg-slate-50 text-slate-700',
        metrics: [] as Array<{ label: string; pct: number; value: number; tone: string }>,
        issues: [] as Array<{ label: string; missing: number; tone: string }>,
      };
    }

    const validMeetingDates = dashboardReviews.filter((review) => {
      const value = review.meetingDate || review.lastReviewDate;
      return value && !Number.isNaN(new Date(value).getTime());
    }).length;
    const managerPresent = dashboardReviews.filter((review) => hasMeaningfulEmployer(review)).length;
    const learnerEmailCount = dashboardReviews.filter((review) => (review.learner.email || '').trim().length > 0).length;
    const learnerPhoneCount = dashboardReviews.filter((review) => (review.learner.phone || '').trim().length > 0).length;
    const signedOffCount = dashboardReviews.filter((review) => review.signedOff).length;
    const overallRatingCount = dashboardReviews.filter((review) => (review.overallRating || '').trim().length > 0).length;
    const fullChecklistCount = dashboardReviews.filter((review) => (review.checklist || []).length >= QA_REPORT_CRITERIA.length).length;
    const actionCoverageCount = dashboardReviews.filter((review) => (review.actions || []).length > 0).length;
    const strengthsCoverageCount = dashboardReviews.filter((review) => (review.strengths || []).length > 0).length;
    const developmentCoverageCount = dashboardReviews.filter((review) => (review.areasForDevelopment || []).length > 0).length;

    const toPct = (value: number) => Number(((value / total) * 100).toFixed(1));

    const metrics = [
      {
        label: 'Valid meeting dates',
        value: validMeetingDates,
        pct: toPct(validMeetingDates),
        tone: 'border-sky-200 bg-sky-50/80 text-sky-900',
      },
      {
        label: 'Manager captured',
        value: managerPresent,
        pct: toPct(managerPresent),
        tone: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
      },
      {
        label: 'Learner email present',
        value: learnerEmailCount,
        pct: toPct(learnerEmailCount),
        tone: 'border-cyan-200 bg-cyan-50/80 text-cyan-900',
      },
      {
        label: 'Learner phone present',
        value: learnerPhoneCount,
        pct: toPct(learnerPhoneCount),
        tone: 'border-blue-200 bg-blue-50/80 text-blue-900',
      },
      {
        label: 'Signed off',
        value: signedOffCount,
        pct: toPct(signedOffCount),
        tone: 'border-violet-200 bg-violet-50/80 text-violet-900',
      },
      {
        label: 'Overall rating present',
        value: overallRatingCount,
        pct: toPct(overallRatingCount),
        tone: 'border-amber-200 bg-amber-50/80 text-amber-900',
      },
      {
        label: '13-point checklist present',
        value: fullChecklistCount,
        pct: toPct(fullChecklistCount),
        tone: 'border-rose-200 bg-rose-50/80 text-rose-900',
      },
      {
        label: 'Actions captured',
        value: actionCoverageCount,
        pct: toPct(actionCoverageCount),
        tone: 'border-fuchsia-200 bg-fuchsia-50/80 text-fuchsia-900',
      },
      {
        label: 'Strengths captured',
        value: strengthsCoverageCount,
        pct: toPct(strengthsCoverageCount),
        tone: 'border-teal-200 bg-teal-50/80 text-teal-900',
      },
      {
        label: 'Development areas captured',
        value: developmentCoverageCount,
        pct: toPct(developmentCoverageCount),
        tone: 'border-orange-200 bg-orange-50/80 text-orange-900',
      },
    ];

    const score = Number((metrics.reduce((sum, item) => sum + item.pct, 0) / metrics.length).toFixed(1));
    const label =
      score >= 90 ? 'Excellent quality' : score >= 75 ? 'Good quality' : score >= 60 ? 'Needs cleanup' : 'High cleanup needed';
    const tone =
      score >= 90
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : score >= 75
        ? 'border-sky-200 bg-sky-50 text-sky-800'
        : score >= 60
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

    return { score, label, tone, metrics, issues: [] };
  }, [dashboardReviews]);

  const managerAttendanceSummary = useMemo(() => {
    const total = dashboardReviews.length;
    if (!total) {
      return {
        total: 0,
        present: 0,
        notPresent: 0,
        presentPct: 0,
        notPresentPct: 0,
        presentSessions: [] as ManagerAttendancePopupItem['sessions'],
        notPresentSessions: [] as ManagerAttendancePopupItem['sessions'],
      };
    }

    const isManagerPresent = (review: ReviewRecord) => {
      const employerName = (review.employer?.name || '').trim().toLowerCase();
      const employerMissing = !employerName;
      const employerMarkedAbsent =
        employerName.includes("didn't attend") ||
        employerName.includes('did not attend') ||
        employerName.includes('not attend');

      return !employerMissing && !employerMarkedAbsent && review.attendance === 'ALL_PRESENT';
    };

    const mapSession = (review: ReviewRecord) => {
      const rawDate = review.meetingDate || review.lastReviewDate || '';
      const parsedDate = rawDate ? new Date(rawDate) : null;
      return {
        learnerName: review.learner.name || 'Unknown Learner',
        meetingDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? format(parsedDate, 'dd MMM yyyy') : '-',
        coachName: review.coach.name || 'Unknown Coach',
        managerName: review.employer?.name || 'Manager not recorded',
      };
    };

    const presentSessions = dashboardReviews.filter(isManagerPresent).map(mapSession);
    const notPresentSessions = dashboardReviews.filter((review) => !isManagerPresent(review)).map(mapSession);
    const present = presentSessions.length;
    const notPresent = notPresentSessions.length;

    return {
      total,
      present,
      notPresent,
      presentPct: Number(((present / total) * 100).toFixed(1)),
      notPresentPct: Number(((notPresent / total) * 100).toFixed(1)),
      presentSessions,
      notPresentSessions,
    };
  }, [dashboardReviews]);

  const qaIndicatorRows = useMemo(() => {
    return QA_REPORT_CRITERIA.map((criterion) => {
      let scoreTotal = 0;
      let matchedCount = 0;

      chartReviews.forEach((review) => {
        const matchedCell = getChecklistMatrixCells(review).find((cell) => cell.category === criterion.category);
        const evaluation = matchedCell?.evaluation || 'NO';
        if (evaluation === 'YES') scoreTotal += 5;
        else if (evaluation === 'PARTIAL') scoreTotal += 3;
        else scoreTotal += 1;
        matchedCount += 1;
      });

      const average = matchedCount ? Number((scoreTotal / matchedCount).toFixed(1)) : 0;
      const pct = Math.max(0, Math.min(100, Math.round((average / 5) * 100)));
      const statusLabel = average >= 4.5 ? 'Outstanding' : average >= 3.5 ? 'Strong' : average >= 2.5 ? 'Developing' : 'Weak';
      const statusClasses =
        average >= 4.5
          ? 'bg-emerald-50 text-emerald-700'
          : average >= 3.5
          ? 'bg-indigo-50 text-indigo-700'
          : average >= 2.5
          ? 'bg-amber-50 text-amber-700'
          : 'bg-rose-50 text-rose-700';

      return {
        criterion: criterion.category,
        average,
        pct,
        statusLabel,
        statusClasses,
      };
    });
  }, [chartReviews]);

  const qaIndicatorAverage = useMemo(() => {
    if (!qaIndicatorRows.length) return 0;
    return Number((qaIndicatorRows.reduce((sum, item) => sum + item.average, 0) / qaIndicatorRows.length).toFixed(1));
  }, [qaIndicatorRows]);
  const formatHours = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return `${Math.round(value)}h`;
  };

  useEffect(() => {
    setTableFilters((prev) => {
      const next = { ...prev };
      let changed = false;
      if (next.coach && !coaches.includes(next.coach)) {
        next.coach = '';
        changed = true;
      }
      if (next.programme && !programmes.includes(next.programme)) {
        next.programme = '';
        changed = true;
      }
      if (next.group && !groups.includes(next.group)) {
        next.group = '';
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [learners, coaches, programmes, groups]);

  const getStatusBadge = (status: ReviewStatus) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-800 border-green-200',
      BOOKING: 'bg-sky-100 text-sky-800 border-sky-200',
      AT_RISK: 'bg-amber-100 text-amber-800 border-amber-200',
      OVERDUE: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels = { COMPLETED: 'Completed', BOOKING: 'Booking', AT_RISK: 'At risk', OVERDUE: 'Overdue' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getAttendanceBadge = (attendance: string) => {
    const styles: Record<string, string> = {
      ALL_PRESENT: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-amber-100 text-amber-800',
      MISSING: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      ALL_PRESENT: 'All present',
      PARTIAL: 'Partial',
      MISSING: 'Missing',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md ${styles[attendance]}`}>
        {labels[attendance]}
      </span>
    );
  };

  const getOtjHoursStatusBadge = (review: ReviewRecord, preferAbove = false) => {
    const status = review.otjHoursStatus;
    const normalized = (status || '').trim().toLowerCase();
    const className =
      normalized === 'ahead'
        ? 'bg-green-100 text-green-800 border-green-200'
        : normalized === 'behind'
        ? 'bg-rose-100 text-rose-800 border-rose-200'
        : normalized === 'need attention'
        ? 'bg-red-100 text-red-800 border-red-200'
        : normalized === 'at risk'
        ? 'bg-amber-100 text-amber-800 border-amber-200'
        : 'bg-gray-100 text-gray-700 border-gray-200';

    return (
      <div className="group relative inline-flex">
        <span className={`px-2 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${className}`}>
          {status || '-'}
        </span>
        <div
          className={`pointer-events-none absolute left-1/2 z-20 hidden w-52 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl group-hover:block ${
            preferAbove ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">OTJ Summary</p>
          <div className="space-y-1.5 text-xs text-gray-700">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Status</span>
              <span className="font-semibold text-gray-900">{status || '-'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Planned</span>
              <span className="font-semibold text-gray-900">{formatHours(review.plannedOtj)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Submitted</span>
              <span className="font-semibold text-gray-900">{formatHours(review.submittedOtj)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Expected</span>
              <span className="font-semibold text-gray-900">{formatHours(review.expectedOtj)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  function hasMeaningfulEmployer(review: ReviewRecord) {
    const employerName = (review.employer?.name || '').trim().toLowerCase();
    if (!employerName) return false;
    if (employerName.includes("didn't attend")) return false;
    if (employerName.includes('didnâ€™t attend')) return false;
    if (employerName.includes('did not attend')) return false;
    if (employerName.includes('not attend')) return false;
    if (employerName === 'unknown employer') return false;
    return true;
  };

  const getEmployerDisplayName = (review: ReviewRecord) =>
    hasMeaningfulEmployer(review) ? review.employer.name : review.learner.name;

  const getEmployerAttendBadge = (review: ReviewRecord) => {
    const employerLabel = (review.employer?.name || '').trim().toLowerCase();
    const employerMissing = !employerLabel;
    const employerMarkedAbsent =
      employerLabel.includes("didn't attend") ||
      employerLabel.includes('didnâ€™t attend') ||
      employerLabel.includes('did not attend') ||
      employerLabel.includes('not attend');
    const employerAttended = !employerMarkedAbsent && hasMeaningfulEmployer(review) && review.attendance === 'ALL_PRESENT';
    const employerPartial = employerMissing || employerMarkedAbsent || review.attendance === 'PARTIAL';

    const className = employerAttended
      ? 'bg-green-100 text-green-800'
      : employerPartial
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';
    const label = employerAttended ? 'All Present' : employerPartial ? 'Partial' : 'Not Attend';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md ${className}`}>{label}</span>
    );
  };

  const normalizeEmployerAttendanceText = (value: string) =>
    (value || '')
      .trim()
      .toLowerCase()
      .replace(/[’'`]/g, '')
      .replace(/\s+/g, ' ');

  const getEmployerAttendBadgeResolved = (review: ReviewRecord) => {
    const employerRaw = (review.employer?.name || '').trim();
    const normalizedEmployer = normalizeEmployerAttendanceText(employerRaw);
    const employerMissing = !normalizedEmployer;
    const employerMarkedAbsent =
      normalizedEmployer.includes('didnt attend') ||
      normalizedEmployer.includes('did not attend') ||
      normalizedEmployer.includes('not attend');
    const employerAttended =
      !employerMissing &&
      !employerMarkedAbsent &&
      review.attendance === 'ALL_PRESENT';
    const employerPartial =
      employerMissing ||
      employerMarkedAbsent ||
      review.attendance === 'PARTIAL';

    const className = employerAttended
      ? 'bg-green-100 text-green-800'
      : employerPartial
        ? 'bg-amber-100 text-amber-800'
        : 'bg-red-100 text-red-800';
    const label = employerAttended ? 'All Present' : employerPartial ? 'Partial' : 'Not Attend';

    return <span className={`px-2 py-1 text-xs font-medium rounded-md ${className}`}>{label}</span>;
  };

  const openDetailDrawer = (review: ReviewRecord) => {
    setSelectedReview(review);
    setSelectedLearnerId(review.learner.id);
  };

  function getChecklistMatrixCells(review: ReviewRecord) {
    const qaRows = getQaCriteriaRows(review);

    return QA_REPORT_CRITERIA.map((criterion) => {
      const criterionText = criterion.category.toLowerCase();
      const matchedRow =
        qaRows.find((item) => {
          const itemCategory = (item.category || '').toLowerCase();
          if (!itemCategory) return false;
          if (itemCategory === criterionText) return true;
          if (itemCategory.includes(criterionText) || criterionText.includes(itemCategory)) return true;
          return criterion.match.some((keyword) => itemCategory.includes(keyword.toLowerCase()));
        }) || null;

      return {
        category: criterion.category,
        evaluation: matchedRow?.evaluation || '',
        comments: matchedRow?.comments || '',
      };
    });
  }

  const handleDueDateClick = (e: React.MouseEvent, review: ReviewRecord) => {
    e.stopPropagation();
    if (dueDatePopup?.reviewId === review.id) {
      setDueDatePopup(null);
      return;
    }
    setDueDatePopup({ reviewId: review.id });
  };

  const getDueDateAlertClass = (nextDueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nextDueDate);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 14) {
      return 'text-red-600 font-semibold';
    }
    return 'text-cyan-700 font-medium';
  };

  const handleExportSessionReport = async () => {
    setSessionReportLoading(true);
    setSessionReportError(null);
    try {
      const res = await fetch(`${apiBase}/progress-reviews/session-report?limit=all`);
      if (!res.ok) {
        throw new Error(`Failed to generate report (${res.status})`);
      }
      const data = (await res.json()) as SessionReportResponse;
      const generatedAt = new Date().toLocaleString('en-GB');
      const reportBody =
        data.reportText && data.reportText.trim().length > 0
          ? normalizeAptimText(data.reportText)
          : `Session Report\nTotal sessions: ${data.summary?.totalSessions ?? 0}`;
      const text = `${reportBody}\n\nGenerated at: ${generatedAt}\n`;
      setSessionReportText(text);
      setSessionReportMeta({
        totalSessions: data.summary?.totalSessions ?? data.sourceCount ?? 0,
        uniqueLearners: data.summary?.uniqueLearners ?? 0,
        uniqueCoaches: data.summary?.uniqueCoaches ?? 0,
        compliance: Math.round(data.summary?.checklistWeightedCompliancePercent ?? 0),
      });
      setReportCoachFilter('');
      setActiveReportId(null);
      setShowSessionReportModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report';
      setSessionReportError(message);
    } finally {
      setSessionReportLoading(false);
    }
  };

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const downloadSessionReport = () => {
    if (!activeReportReview) return;
    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) return;
    const statusLabel = (status: string) =>
      status === 'COMPLETED' ? 'Completed' : status === 'BOOKING' ? 'Booking' : status === 'AT_RISK' ? 'Amber' : 'Red';
    const evalLabel = (evaluation: string) =>
      evaluation === 'YES' ? 'Yes' : evaluation === 'PARTIAL' ? 'Partial' : 'No';
    const toCleanText = (value: string) => normalizeAptimText(value || '').replace(/\s+/g, ' ').trim();
    const tryParseJsonLikeObject = (raw: string): Record<string, any> | null => {
      const text = (raw || '').trim();
      if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null;
      try {
        const parsed = JSON.parse(text) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, any>;
        if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'object') return parsed[0] as Record<string, any>;
      } catch {
        // Handle pseudo-json such as single-quoted object text.
      }
      const getString = (key: string) => {
        const match = text.match(
          new RegExp(`['"]?${key}['"]?\\s*:\\s*(['"])([\\s\\S]*?)\\1`, 'i')
        );
        return match?.[2]?.trim() || '';
      };
      const getNumber = (key: string) => {
        const match = text.match(new RegExp(`['"]?${key}['"]?\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'));
        return match?.[1] || '';
      };
      const rag = getString('rag');
      const qualitative = getString('qualitative');
      const professionalJudgement =
        getString('professional_judgement') || getString('professionalJudgement');
      const averageRating = getNumber('average_rating') || getNumber('averageRating');
      if (!rag && !qualitative && !professionalJudgement && !averageRating) return null;
      return {
        rag,
        qualitative,
        professional_judgement: professionalJudgement,
        average_rating: averageRating,
      };
    };
    const getPrintableSummary = (review: ReviewRecord) => {
      const rawCandidates = [review.overallJudgement || '', review.reportText || '', review.overallRating || ''];
      for (const raw of rawCandidates) {
        const parsed = tryParseJsonLikeObject(raw);
        if (parsed) {
          const text =
            (typeof parsed.qualitative === 'string' && parsed.qualitative) ||
            (typeof parsed.executive_summary === 'string' && parsed.executive_summary) ||
            (typeof parsed.professional_judgement === 'string' && parsed.professional_judgement) ||
            '';
          if (text) return toCleanText(text);
        }
      }
      return toCleanText(review.overallJudgement || review.riskNotes || 'No executive summary available.');
    };
    const getPrintableRating = (review: ReviewRecord) => {
      const base = statusLabel(review.status || 'OVERDUE');
      const rawCandidates = [review.overallRating || '', review.reportText || '', review.overallJudgement || ''];
      for (const raw of rawCandidates) {
        const parsed = tryParseJsonLikeObject(raw);
        if (!parsed) continue;
        const rag =
          (typeof parsed.rag === 'string' && parsed.rag.trim()) ||
          (typeof parsed.status === 'string' && parsed.status.trim()) ||
          base;
        const avgRaw = parsed.average_rating ?? parsed.averageRating ?? '';
        const avgText = typeof avgRaw === 'number' || typeof avgRaw === 'string' ? String(avgRaw).trim() : '';
        if (avgText) {
          return { rag: toCleanText(rag), score: `${avgText}/5` };
        }
        return { rag: toCleanText(rag), score: toCleanText(review.overallRating || '-') || '-' };
      }
      return { rag: base, score: toCleanText(review.overallRating || '-') || '-' };
    };

    const inferTranscriptRows = (review: ReviewRecord) => {
      let sourceText = (review.reportText && review.reportText.trim()) || '';

      // Avoid rendering raw JSON text in the transcript table.
      if (sourceText.startsWith('{') || sourceText.startsWith('[')) {
        try {
          const parsed = JSON.parse(sourceText) as Record<string, any>;
          const candidateParts: string[] = [];
          if (typeof parsed.executive_summary === 'string') candidateParts.push(parsed.executive_summary);
          if (typeof parsed.professional_judgement === 'string') candidateParts.push(parsed.professional_judgement);
          if (Array.isArray(parsed.strengths)) {
            candidateParts.push(...parsed.strengths.filter((v) => typeof v === 'string'));
          }
          if (Array.isArray(parsed.areas_for_development)) {
            candidateParts.push(...parsed.areas_for_development.filter((v) => typeof v === 'string'));
          }
          if (Array.isArray(parsed.priority_actions)) {
            for (const item of parsed.priority_actions) {
              if (typeof item === 'string') candidateParts.push(item);
              else if (item && typeof item === 'object' && typeof item.action === 'string') {
                candidateParts.push(item.action);
              }
            }
          }
          sourceText = candidateParts.join('. ').trim();
        } catch {
          sourceText = '';
        }
      }

      if (!sourceText) {
        sourceText = review.overallJudgement || '';
      }

      const chunks = sourceText
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
      if (chunks.length === 0) {
        return [
          { timestamp: '00:00:30', speaker: review.coach.name || 'Coach', evidence: 'No transcript evidence available.', metric: 'General' },
        ];
      }
      return chunks.map((chunk, idx) => {
        const min = String(Math.floor((idx * 75) / 60)).padStart(2, '0');
        const sec = String((idx * 75) % 60).padStart(2, '0');
        const checklistMetric = review.checklist[idx % Math.max(1, review.checklist.length)]?.category || 'General';
        return {
          timestamp: `00:${min}:${sec}`,
          speaker: idx % 2 === 0 ? review.coach.name || 'Coach' : review.learner.name || 'Learner',
          evidence: chunk,
          metric: checklistMetric,
        };
      });
    };

    const printSource = activeReportReview ? [activeReportReview] : [];

    const sessionsHtml = printSource
      .map((review, index) => {
        const printableSummary = getPrintableSummary(review);
        const printableRating = getPrintableRating(review);
        const strengths = review.strengths?.length
          ? review.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join('')
          : '<li>No strengths recorded.</li>';
        const areas = review.areasForDevelopment?.length
          ? review.areasForDevelopment.map((s) => `<li>${escapeHtml(s)}</li>`).join('')
          : '<li>No areas for development recorded.</li>';
        const qaRows = getQaCriteriaRows(review)
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.category || '-')}</td>
                <td><span class="pill ${item.evaluation === 'YES' ? 'pill-green' : item.evaluation === 'PARTIAL' ? 'pill-amber' : 'pill-red'}">${escapeHtml(evalLabel(item.evaluation || 'NO'))}</span></td>
                <td>${escapeHtml(item.comments || '')}</td>
              </tr>
            `
          )
          .join('');
        const evaluationCriteriaHtml = getQaCriteriaRows(review).map(
          (item, itemIndex) => `
            <div class="criteria-card">
              <span class="criteria-index">${itemIndex + 1}</span>
              <span class="criteria-text">${escapeHtml(item.category || '-')}</span>
            </div>
          `
        ).join('');
        return `
          <section class="report-page ${index > 0 ? 'page-break' : ''}">
            <div class="report-kicker">Quality Assurance Review Record</div>
            <div class="report-header">
              <div class="logo-box">
                <img src="${escapeHtml(reportLogoSrc)}" alt="Kent Business College logo" />
              </div>
              <div class="title-box">
                <p class="report-subtitle">Inspection-ready summary</p>
                <h1>${escapeHtml(QA_REPORT_TITLE)}</h1>
              </div>
            </div>

            <table class="info-table">
              <tr><th>Learner</th><td>${escapeHtml(review.learner.name || '-')}</td></tr>
              <tr><th>Coach</th><td>${escapeHtml(review.coach.name || '-')}</td></tr>
              <tr><th>Duration</th><td>${escapeHtml(typeof review.duration === 'number' ? `${Math.round(review.duration)} minutes` : '-')}</td></tr>
              <tr><th>Programme</th><td>${escapeHtml(review.programme || '-')}</td></tr>
              <tr><th>Group</th><td>${escapeHtml(review.group || '-')}</td></tr>
              <tr><th>Session Date</th><td>${escapeHtml(new Date(review.lastReviewDate).toLocaleDateString('en-GB'))}</td></tr>
            </table>

            <h2>Checklist Categories</h2>
            <p class="section-intro">Checklist categories returned directly from the database for this session.</p>
            <div class="criteria-grid">${evaluationCriteriaHtml}</div>

            <h2>Executive Summary</h2>
            <p>${escapeHtml(printableSummary)}</p>

            <p><strong>Follow the table with:</strong></p>
            <h2>Strengths</h2>
            <ul>${strengths}</ul>

            <h2>Areas for Development</h2>
            <ul>${areas}</ul>

            <h2>Overall Professional Judgement</h2>
            <p>${escapeHtml(review.riskNotes || 'This session was reviewed based on available QA and meeting indicators.')}</p>

            <h2>QA Checklist</h2>
            <table class="data-table">
              <thead>
                <tr><th>Category</th><th>Evaluation</th><th>Comments</th></tr>
              </thead>
              <tbody>
                ${qaRows || '<tr><td colspan="3">No QA checklist data available.</td></tr>'}
              </tbody>
            </table>

            <h2>Overall Rating</h2>
            <p><strong>RAG:</strong> ${escapeHtml(printableRating.rag)}</p>
            <p><strong>Overall QA Score:</strong> ${escapeHtml(printableRating.score || '-')}</p>
          </section>
        `;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Coach Session Report</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #172033; background: #eef2f7; }
            .report-page { margin-bottom: 18px; background: #ffffff; border: 1px solid #cbd5e1; padding: 14px 16px 16px; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08); }
            .page-break { page-break-before: always; }
            .report-kicker { margin-bottom: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; }
            .report-header { display: grid; grid-template-columns: 165px 1fr; align-items: center; border: 1px solid #94a3b8; border-radius: 14px; overflow: hidden; margin-bottom: 14px; }
            .logo-box { height: 90px; display: flex; align-items: center; justify-content: center; padding: 8px 8px; border-right: 1px solid #94a3b8; background: #ffffff; }
            .logo-box img { width: 100%; max-width: 190px; max-height: 82px; object-fit: contain; object-position: center; }
            .title-box { padding: 12px 16px; }
            .report-subtitle { margin: 0 0 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #64748b; }
            .title-box h1 { margin: 0; font-size: 24px; line-height: 1.15; color: #0f172a; }
            h2 { margin: 16px 0 6px; font-size: 17px; color: #0f172a; }
            .section-intro { color: #475569; }
            p, li { font-size: 12px; line-height: 1.6; margin: 0 0 6px; }
            ul { margin: 0 0 10px 20px; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: top; font-size: 11px; }
            th { background: #e2e8f0; color: #334155; font-weight: 700; }
            .info-table th { width: 220px; background: #f8fafc; color: #475569; }
            .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; }
            .pill-green { background: #dcfce7; color: #166534; }
            .pill-amber { background: #fef3c7; color: #92400e; }
            .pill-red { background: #fee2e2; color: #b91c1c; }
            .criteria-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
            .criteria-card { display: flex; align-items: flex-start; gap: 8px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
            .criteria-index { min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #1e293b; color: #ffffff; font-size: 11px; font-weight: 700; }
            .criteria-text { font-size: 12px; line-height: 1.45; font-weight: 600; color: #1e293b; }
            @media print {
              body { margin: 0; background: #fff; }
              .report-page { page-break-inside: avoid; break-inside: avoid; box-shadow: none; border-color: #94a3b8; }
            }
          </style>
        </head>
        <body>
          ${sessionsHtml || '<p style="font-family: Arial, sans-serif;">No sessions available for the selected coach.</p>'}
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  if (selectedLearnerId) {
    return (
      <LearnerDetailPage
        learnerId={selectedLearnerId}
        reviews={reviews}
        initialReviewId={selectedReview?.id || null}
        initialTab={selectedReview ? 'reviews' : 'overview'}
        onBack={() => {
          setSelectedLearnerId(null);
          setSelectedReview(null);
        }}
      />
    );
  }

  if (loading && !reviews.length && !loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
            <div className="h-6 w-6 rounded-full border-2 border-cyan-200 border-t-cyan-600 animate-spin" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Loading progress review data</h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;re pulling live records from the database and preparing the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,#f7fbff_0%,#f8fafc_38%,#f8fafc_100%)]"
      onClick={() => {
        setDueDatePopup(null);
        setOpenEvidenceKey(null);
      }}
    >
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {!isChecklistMatrixPage ? (
        <>
        {/* Header */}
        <div className="relative mb-6 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur lg:px-7">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_left,_rgba(14,165,233,0.14),_transparent_70%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0 rounded-[24px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-2.5 shadow-sm">
              <img
                src={logoSources[0]}
                alt="Kent Business College logo"
                className="h-16 w-auto object-contain sm:h-[74px]"
              />
            </div>
            <div className="min-w-0 flex min-h-16 flex-col justify-center">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  Live Dashboard
                </span>
              </div>
              <h1 className="mt-2 text-[32px] font-black leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-[40px]">
                Progress Review Report
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 sm:text-[15px]">
                <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                  <i className="ri-calendar-line text-cyan-600"></i>
                  {new Date().toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="inline-flex items-center gap-2 text-slate-400">
                  <i className="ri-database-2-line text-slate-400"></i>
                  Live progress review analytics
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleExportSessionReport}
            disabled={sessionReportLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0891b2_0%,#0f766e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,145,178,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_14px_30px_rgba(8,145,178,0.28)] disabled:cursor-not-allowed disabled:bg-cyan-400 disabled:shadow-none sm:w-auto whitespace-nowrap"
          >
            <i className="ri-download-2-line text-sm"></i>
            {sessionReportLoading ? 'Generating...' : 'Export Session Report'}
          </button>
          </div>
        </div>

        {loading && (
          <div className="mb-4 rounded-lg border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
            Loading live data from database...
          </div>
        )}

        <div className="mb-4 flex items-start gap-3 rounded-[22px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96)_0%,rgba(255,247,237,0.98)_100%)] px-4 py-3.5 text-sm text-amber-900 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <i className="ri-information-line text-base"></i>
          </span>
          <div>
            <div className="font-semibold text-amber-950">Reporting note</div>
            <div className="mt-1 leading-6 text-amber-800">
              The current dashboard view reflects data from March only.
            </div>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load live data: {loadError}
          </div>
        )}

        {sessionReportError && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to export session report: {sessionReportError}
          </div>
        )}

        {/* Dashboard Filters */}
        <div className="mb-7 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
              <i className="ri-equalizer-line text-lg"></i>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Dashboard Filters</div>
              <div className="mt-0.5 text-sm font-medium text-slate-600">Refine the coach and date window for this view</div>
            </div>
            <button
              type="button"
              onClick={clearDashboardFilters}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-cyan-200 hover:text-cyan-700"
            >
              <i className="ri-refresh-line"></i>
              Clear Filters
            </button>
          </div>
          <div className="px-5 py-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,1.5fr)_minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Coach</label>
                <div className="relative">
                <i className="ri-user-star-line absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none"></i>
                <select
                  value={dashboardCoachFilter}
                  onChange={(e) => setDashboardCoachFilter(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-10 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="">All Coaches</option>
                  {coaches.map((coach) => (
                    <option key={coach} value={coach}>{coach}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none"></i>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Date Range</label>
                <select
                  value={dashboardDatePreset}
                  onChange={(e) => setDashboardDatePreset(e.target.value as DashboardDatePreset)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                >
                  <option value="ALL">All Time</option>
                  <option value="LAST_MONTH">Last Month</option>
                  <option value="LAST_3_MONTHS">Last 3 Months</option>
                  <option value="CUSTOM">Custom Range</option>
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">From</label>
                <input
                  type="date"
                  value={dashboardDateFrom}
                  onChange={(e) => {
                    setDashboardDateFrom(e.target.value);
                    if (dashboardDatePreset !== 'CUSTOM') setDashboardDatePreset('CUSTOM');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">To</label>
                <input
                  type="date"
                  value={dashboardDateTo}
                  onChange={(e) => {
                    setDashboardDateTo(e.target.value);
                    if (dashboardDatePreset !== 'CUSTOM') setDashboardDatePreset('CUSTOM');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-cyan-300 focus:outline-none focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Quick Range</span>
              <button
                type="button"
                onClick={() => {
                  setDashboardDatePreset('LAST_MONTH');
                  setDashboardDateFrom('');
                  setDashboardDateTo('');
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  dashboardDatePreset === 'LAST_MONTH'
                    ? 'bg-[linear-gradient(135deg,#0891b2_0%,#0f766e_100%)] text-white shadow-[0_8px_18px_rgba(8,145,178,0.22)]'
                    : 'border border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                }`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => {
                  setDashboardDatePreset('LAST_3_MONTHS');
                  setDashboardDateFrom('');
                  setDashboardDateTo('');
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  dashboardDatePreset === 'LAST_3_MONTHS'
                    ? 'bg-[linear-gradient(135deg,#0891b2_0%,#0f766e_100%)] text-white shadow-[0_8px_18px_rgba(8,145,178,0.22)]'
                    : 'border border-cyan-100 bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                }`}
              >
                Last 3 Months
              </button>
              <button
                type="button"
                onClick={() => {
                  setDashboardDatePreset('ALL');
                  setDashboardDateFrom('');
                  setDashboardDateTo('');
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  dashboardDatePreset === 'ALL'
                    ? 'bg-slate-900 text-white shadow-[0_8px_18px_rgba(15,23,42,0.16)]'
                    : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Reset Dates
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {dashboardReviews.length > 0 ? (
          <>
            <ErrorBoundary
              fallbackTitle="Chart section could not be displayed"
              fallbackMessage="The live data loaded, but one of the dashboard visualizations failed during render. The rest of the page is still available below."
            >
            {/* Charts */}
            <div className="mb-7 grid grid-cols-1 gap-5 xl:grid-cols-[1.02fr_1.58fr]">
              <div className="h-full overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">RAG Overview</p>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">RAG Status Distribution</h3>
                    <p className="mt-1 text-sm text-slate-400">Quality ratings breakdown · {ragStatusDistribution.total} total</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <i className="ri-donut-chart-line text-emerald-600"></i>
                    {ragStatusDistribution.total} sessions
                  </div>
                </div>

                <div className="relative mx-auto mt-5 h-[220px] max-w-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ragStatusDistribution.items}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                        onClick={(_, index) => {
                          const selected = ragStatusDistribution.items[index];
                          if (selected?.value) setActiveRagPopup(selected);
                        }}
                      >
                        {ragStatusDistribution.items.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} className={entry.value ? 'cursor-pointer' : ''} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-bold tracking-tight text-slate-900">{ragStatusDistribution.total}</div>
                    <div className="mt-1 text-base font-medium text-slate-400">Sessions</div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                  {ragStatusDistribution.items.map((item) => (
                    <button
                      key={`rag-legend-${item.name}`}
                      type="button"
                      onClick={() => {
                        if (item.value) setActiveRagPopup(item);
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-slate-50 disabled:cursor-default disabled:hover:bg-transparent"
                      disabled={!item.value}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      {item.name}
                    </button>
                  ))}
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  <i className="ri-cursor-line text-slate-400"></i>
                  Click a chart segment or color label to view learner names and meeting dates
                </div>

              </div>

              <div className="h-full overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Checklist Quality</p>
                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Checklist Evaluation Summary</h3>
                    <p className="mt-1 text-sm text-slate-400">How many checklist checks were scored as Yes, Partial, and No</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                    <i className="ri-list-check-3 text-sky-600"></i>
                    {complianceTotal} checks
                  </div>
                </div>

                <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100 shadow-inner">
                  {complianceBreakdown.map((item) => (
                    <div key={`checklist-segment-${item.name}`} style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  ))}
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {complianceBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className={`relative overflow-hidden rounded-[24px] border px-4 py-4 shadow-sm ${
                        item.name === 'Yes'
                          ? 'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96)_0%,rgba(240,253,250,0.9)_100%)] text-emerald-900'
                          : item.name === 'Partial'
                          ? 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,247,237,0.9)_100%)] text-amber-900'
                          : 'border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.96)_0%,rgba(255,245,245,0.9)_100%)] text-rose-900'
                      } ${item.value ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : ''}`}
                      onClick={() => {
                        if (item.value) setActiveChecklistPopup(item);
                      }}
                    >
                      <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-white/35 blur-2xl"></div>
                      <div className="relative flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                            <i
                              className={`${
                                item.name === 'Yes'
                                  ? 'ri-check-line text-emerald-600'
                                  : item.name === 'Partial'
                                  ? 'ri-subtract-line text-amber-600'
                                  : 'ri-close-line text-rose-600'
                              } text-base`}
                            ></i>
                          </span>
                          <span className="text-sm font-semibold">{item.name}</span>
                        </div>
                        <span className="rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold shadow-sm">
                          {item.pct}%
                        </span>
                      </div>
                      <div className="relative mt-5 flex items-end justify-between gap-3">
                        <div>
                          <div className="text-4xl font-black tracking-tight">{item.value}</div>
                          <div className="mt-1 text-sm opacity-70">checklist evaluations</div>
                        </div>
                        <div className="rounded-2xl bg-white/70 px-3 py-2 text-right shadow-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">Share</div>
                          <div className="mt-1 text-lg font-bold">{item.pct}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                    <i className="ri-cursor-line text-slate-400"></i>
                    Click any checklist card to view item names and dates
                  </div>
                </div>
              </div>
            </div>
            </ErrorBoundary>

            {activeRagPopup ? <RAGSessionsPopup item={activeRagPopup} onClose={() => setActiveRagPopup(null)} /> : null}
            {activeChecklistPopup ? (
              <ChecklistEvidencePopup item={activeChecklistPopup} onClose={() => setActiveChecklistPopup(null)} />
            ) : null}
            {activeManagerAttendancePopup ? (
              <ManagerAttendancePopup item={activeManagerAttendancePopup} onClose={() => setActiveManagerAttendancePopup(null)} />
            ) : null}
            {!isChecklistMatrixPage && activeChecklistCellEvidence ? (
              <ChecklistCellEvidencePopup item={activeChecklistCellEvidence} onClose={() => setActiveChecklistCellEvidence(null)} />
            ) : null}

            <div className="mb-7 overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-5 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Manager Attendance</p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Did the manager attend?</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Based on manager/employer name availability plus the recorded session attendance status.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  <i className="ri-user-follow-line text-indigo-600"></i>
                  {managerAttendanceSummary.total} sessions reviewed
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  className="cursor-pointer rounded-[24px] border border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96)_0%,rgba(240,253,250,0.9)_100%)] px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() =>
                    setActiveManagerAttendancePopup({
                      name: 'Manager Present',
                      value: managerAttendanceSummary.present,
                      pct: managerAttendanceSummary.presentPct,
                      color: '#10b981',
                      sessions: managerAttendanceSummary.presentSessions,
                    })
                  }
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80">Manager Present</div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="text-4xl font-black tracking-tight text-emerald-900">{managerAttendanceSummary.present}</div>
                    <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {managerAttendanceSummary.presentPct}%
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${managerAttendanceSummary.presentPct}%` }}
                    />
                  </div>
                </div>

                <div
                  className="cursor-pointer rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.96)_0%,rgba(255,245,245,0.9)_100%)] px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() =>
                    setActiveManagerAttendancePopup({
                      name: 'Manager Not Present',
                      value: managerAttendanceSummary.notPresent,
                      pct: managerAttendanceSummary.notPresentPct,
                      color: '#f43f5e',
                      sessions: managerAttendanceSummary.notPresentSessions,
                    })
                  }
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700/80">Manager Not Present</div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="text-4xl font-black tracking-tight text-rose-900">{managerAttendanceSummary.notPresent}</div>
                    <div className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-rose-800">
                      {managerAttendanceSummary.notPresentPct}%
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${managerAttendanceSummary.notPresentPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                  <i className="ri-cursor-line text-slate-400"></i>
                  Click any attendance card to view learner details and dates
                </div>
              </div>
            </div>

            {false ? (
            <div className="grid grid-cols-1 gap-4 mb-7 items-stretch">
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-sm">
                <div className="mb-2.5 border-b border-slate-200 pb-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quality Review</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-bold tracking-tight text-slate-900">Checklist Compliance</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">QA criteria evaluation breakdown</p>
                    </div>
                    <p className="inline-flex shrink-0 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[9px] font-medium text-sky-700">
                      Click any checklist status card to view supporting evidence.
                    </p>
                  </div>
                </div>
                <div className="grid flex-1 min-h-0 grid-cols-1 gap-2">
                  {complianceBreakdown.map((item) => (
                    <div
                      key={`chip-${item.name}`}
                      className={`relative rounded-[20px] border bg-white px-3 py-2.5 shadow-sm transition-all ${
                        item.evidence?.length ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/80' : ''
                      } ${
                        openEvidenceKey === `compliance-${item.name}`
                          ? 'border-sky-300 ring-2 ring-sky-100 shadow-md'
                          : 'border-slate-200'
                      }`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!item.evidence?.length) return;
                        setOpenEvidenceKey((prev) => (prev === `compliance-${item.name}` ? null : `compliance-${item.name}`));
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <div>
                            <div className="text-[14px] font-semibold tracking-tight text-slate-900">{item.name}</div>
                            <div className="mt-0.5 text-[10px] text-slate-500">{item.value} checklist items</div>
                          </div>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700 shadow-sm">
                          {item.pct}%
                        </div>
                      </div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }}></div>
                      </div>
                      <HoverEvidenceCard
                        title={`${item.name} Evidence`}
                        subtitle="Checklist items and dates"
                        evidence={item.evidence || []}
                        active={openEvidenceKey === `compliance-${item.name}`}
                        placement="overlay"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-sm">
                <div className="mb-2.5 border-b border-slate-200 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Participation</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 mb-1">Attendance Overview</h3>
                  <p className="text-xs text-slate-500">Session attendance split</p>
                </div>
                <div className="mb-2.5 rounded-xl border border-sky-100 bg-sky-50/70 px-2.5 py-1.5 text-[10px] text-sky-800">
                  Click any attendance card to view supporting evidence.
                </div>
                <div className="flex flex-1 flex-col gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/70 p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Attendance Split</span>
                      <span className="text-[11px] text-slate-400">{attendanceBreakdown.reduce((sum, item) => sum + item.value, 0)} sessions</span>
                    </div>
                    <div className="overflow-hidden rounded-full bg-slate-200/80">
                      <div className="flex h-3.5 w-full">
                        {attendanceBreakdown.map((item) => (
                          <div
                            key={`attendance-segment-${item.name}`}
                            className="h-full"
                            style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                            title={`${item.name}: ${item.pct}% (${item.value})`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {attendanceBreakdown.map((item) => (
                      <div
                        key={`attendance-card-${item.name}`}
                        className={`relative cursor-pointer rounded-2xl border bg-white/95 p-2.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/80 ${
                          openEvidenceKey === `attendance-${item.name}`
                            ? 'border-sky-300 ring-2 ring-sky-100 shadow-md'
                            : 'border-slate-200'
                        }`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenEvidenceKey((prev) => (prev === `attendance-${item.name}` ? null : `attendance-${item.name}`));
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                            <span className="text-[13px] font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{item.pct}%</span>
                        </div>
                        <div className="mt-2 text-xl font-bold text-slate-900">{item.value}</div>
                        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">sessions</div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/70">
                          <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }}></div>
                        </div>
                        <HoverEvidenceCard
                          title={`${item.name} Evidence`}
                          subtitle="Attendance session dates"
                          evidence={item.sessionDates || []}
                          active={openEvidenceKey === `attendance-${item.name}`}
                          placement="overlay"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-3.5 shadow-sm">
                <div className="mb-2.5 border-b border-slate-200 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">OTJ Monitoring</p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900 mb-1">OTJ Status Overview</h3>
                  <p className="text-xs text-slate-500">Off-the-job hours status split</p>
                </div>
                <div className="mb-2.5 rounded-xl border border-sky-100 bg-sky-50/70 px-2.5 py-1.5 text-[10px] text-sky-800">
                  Hover over any OTJ segment to view supporting evidence.
                </div>
                <div className="flex flex-1 items-center justify-center py-0.5">
                  <div className="flex w-full max-w-[420px] items-center justify-center gap-5">
                    <div className="h-[200px] w-full max-w-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={otjBreakdown}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={62}
                            outerRadius={94}
                            paddingAngle={3}
                            stroke="none"
                          >
                            {otjBreakdown.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<OtjTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex min-w-[120px] flex-col items-start gap-2">
                      {otjBreakdown.map((item) => (
                        <div key={`otj-legend-${item.name}`} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            ) : null}
            {false ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-7">
              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Planning Queue</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">Next Planned Reviews</h3>
                    <p className="text-xs text-slate-500">Nearest review dates from the imported progress review data</p>
                  </div>
                  <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                    {upcomingPlannedReviews.length} showing
                  </span>
                </div>
                <div className="max-h-[23rem] flex-1 space-y-2 overflow-y-auto pr-1">
                  {upcomingPlannedReviews.map((review) => (
                    <div
                      key={`upcoming-${review.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-3 shadow-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-slate-900">{review.learner.name}</div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {review.coach.name} · {review.programme}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-[13px] font-semibold ${getDueDateAlertClass(review.nextDueDate)}`}>
                          {format(new Date(review.nextDueDate), 'dd MMM yyyy')}
                        </div>
                        <div className="mt-1">{getStatusBadge(review.status)}</div>
                      </div>
                    </div>
                  ))}
                  {upcomingPlannedReviews.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                      No planned reviews available for the current filter.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Capacity Review</p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">Owner Workload</h3>
                    <p className="text-xs text-slate-500">Sessions grouped by coach / owner from the review table</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Top coaches
                  </span>
                </div>
                <div className="max-h-[23rem] flex-1 space-y-2 overflow-y-auto pr-1">
                  {ownerWorkload.map((owner) => (
                    <div key={owner.owner} className="rounded-2xl border border-slate-200 bg-white/90 px-3.5 py-3 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="truncate text-[13px] font-semibold text-slate-900">{owner.owner}</div>
                        <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[12px] font-bold text-slate-900">{owner.total}</div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-2 text-emerald-700">
                          <div className="font-semibold">{owner.completed}</div>
                          <div>Completed</div>
                        </div>
                        <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-2.5 py-2 text-sky-700">
                          <div className="font-semibold">{owner.booking}</div>
                          <div>Booked</div>
                        </div>
                        <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-2.5 py-2 text-amber-700">
                          <div className="font-semibold">{owner.atRisk}</div>
                          <div>At Risk</div>
                        </div>
                        <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-2.5 py-2 text-rose-700">
                          <div className="font-semibold">{owner.overdue}</div>
                          <div>Overdue</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ownerWorkload.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                      No owner data available for the current filter.
                    </div>
                  ) : null}
                </div>
              </div>
              </div>
            ) : null}
          </>
        ) : null}

        {false && isChecklistMatrixPage ? (
        <>
        {/* Filters */}
        <div className="mb-6 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <i className="ri-filter-3-line text-lg"></i>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Filters</div>
                <div className="mt-0.5 text-sm font-medium text-slate-600">Search and refine the checklist matrix</div>
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-violet-200 hover:text-violet-700 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line"></i>
              Clear Filters
            </button>
          </div>
          <div className="px-5 py-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Learner</label>
                <i className="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                <input
                  type="search"
                  value={tableFilters.learnerSearch}
                  onChange={(e) => setTableFilters({ ...tableFilters, learnerSearch: e.target.value })}
                  placeholder="All Learners"
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Review Date</label>
                <i className="ri-calendar-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                <input
                  type="date"
                  value={tableFilters.reviewDate}
                  onChange={(e) => setTableFilters({ ...tableFilters, reviewDate: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Programme</label>
                <i className="ri-book-open-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                <select
                  value={tableFilters.programme}
                  onChange={(e) => setTableFilters({ ...tableFilters, programme: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-10 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">All Programmes</option>
                  {programmes.map((programme) => (
                    <option key={programme} value={programme}>{programme}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>

              <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Status</label>
                <i className="ri-pulse-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                <select
                  value={tableFilters.status}
                  onChange={(e) => setTableFilters({ ...tableFilters, status: e.target.value as ReviewStatus | '' })}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-10 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BOOKING">Booked</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>

              <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Contact Status</label>
                <i className="ri-phone-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                <select
                  value={tableFilters.contactStatus}
                  onChange={(e) => setTableFilters({ ...tableFilters, contactStatus: e.target.value as ContactOutcome | '' })}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-10 py-3 text-sm font-medium text-slate-700 shadow-sm transition focus:border-violet-300 focus:outline-none focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">All Contact Status</option>
                  <option value="NONE">{contactOutcomeLabels.NONE}</option>
                  <option value="NO_ANSWER">{contactOutcomeLabels.NO_ANSWER}</option>
                  <option value="CONFIRMED_BOOKING">{contactOutcomeLabels.CONFIRMED_BOOKING}</option>
                  <option value="CALL_BACK_REQUESTED">{contactOutcomeLabels.CALL_BACK_REQUESTED}</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
              </div>
            </div>
          </div>
        </div>
        </>
        ) : null}

        </>
        ) : null}

        {isChecklistMatrixPage ? (
          <div className="relative mb-6 overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur lg:px-7">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-[radial-gradient(circle_at_left,_rgba(14,165,233,0.14),_transparent_70%)]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex items-center gap-4 sm:gap-5">
                <div className="relative shrink-0 rounded-[24px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-2.5 shadow-sm">
                  <img
                    src={logoSources[0]}
                    alt="Kent Business College logo"
                    className="h-16 w-auto object-contain sm:h-[74px]"
                  />
                </div>
                <div className="min-w-0 flex min-h-16 flex-col justify-center">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
                      Live Dashboard
                    </span>
                  </div>
                  <h1 className="mt-2 text-[32px] font-black leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-[40px]">
                    Progress Review
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 sm:text-[15px]">
                    <span className="inline-flex items-center gap-2 font-medium text-slate-600">
                      <i className="ri-calendar-line text-cyan-600"></i>
                      {new Date().toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-2 text-slate-400">
                      <i className="ri-database-2-line text-slate-400"></i>
                      Live progress review analytics
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:text-violet-700 sm:self-end"
                >
                  <i className="ri-arrow-left-line"></i>
                  Back to Dashboard
                </Link>
                <button
                  onClick={handleExportSessionReport}
                  disabled={sessionReportLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0891b2_0%,#0f766e_100%)] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(8,145,178,0.22)] transition hover:translate-y-[-1px] hover:shadow-[0_14px_30px_rgba(8,145,178,0.28)] disabled:cursor-not-allowed disabled:bg-cyan-400 disabled:shadow-none sm:w-auto whitespace-nowrap"
                >
                  <i className="ri-download-2-line text-sm"></i>
                  {sessionReportLoading ? 'Generating...' : 'Export Session Report'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isChecklistMatrixPage ? (
          <div className="mb-4 flex items-start gap-3 rounded-[22px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.96)_0%,rgba(255,247,237,0.98)_100%)] px-4 py-3.5 text-sm text-amber-900 shadow-[0_10px_24px_rgba(245,158,11,0.08)]">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <i className="ri-information-line text-base"></i>
            </span>
            <div>
              <div className="font-semibold text-amber-950">Reporting note</div>
              <div className="mt-1 leading-6 text-amber-800">
                The checklist matrix currently shows data from March only.
              </div>
            </div>
          </div>
        ) : null}

        {isChecklistMatrixPage ? (
          <div className="mb-6 overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_48%,#f8fafc_100%)] px-6 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#eef2ff_0%,#f5f3ff_52%,#ecfeff_100%)] text-violet-700 shadow-[0_12px_28px_rgba(99,102,241,0.16)]">
                    <i className="ri-equalizer-line text-lg"></i>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Refine View</div>
                    <div className="mt-1 text-base font-semibold text-slate-900">Checklist Matrix Filters</div>
                    <div className="mt-1 text-sm text-slate-500">Search by learner or narrow the table by programme and coach.</div>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-violet-200 hover:bg-white hover:text-violet-700"
                >
                  <i className="ri-refresh-line text-base"></i>
                  Reset Filters
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <label className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                      <i className="ri-search-line text-sm"></i>
                    </span>
                    Learner Search
                  </label>
                  <div className="relative">
                    <i className="ri-user-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <input
                      type="search"
                      value={tableFilters.learnerSearch}
                      onChange={(e) => setTableFilters({ ...tableFilters, learnerSearch: e.target.value })}
                      placeholder="Type learner name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 py-3.5 text-sm font-medium text-slate-700 shadow-inner transition placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <label className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                      <i className="ri-book-open-line text-sm"></i>
                    </span>
                    Programme
                  </label>
                  <div className="relative">
                    <i className="ri-book-open-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <select
                      value={tableFilters.programme}
                      onChange={(e) => setTableFilters({ ...tableFilters, programme: e.target.value })}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-10 py-3.5 text-sm font-medium text-slate-700 shadow-inner transition focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">All Programmes</option>
                      {programmes.map((programme) => (
                        <option key={programme} value={programme}>{programme}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
                  </div>
                </div>

                <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <label className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <i className="ri-user-star-line text-sm"></i>
                    </span>
                    Coach
                  </label>
                  <div className="relative">
                    <i className="ri-user-star-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                    <select
                      value={tableFilters.coach}
                      onChange={(e) => setTableFilters({ ...tableFilters, coach: e.target.value })}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-10 py-3.5 text-sm font-medium text-slate-700 shadow-inner transition focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                    >
                      <option value="">All Coaches</option>
                      {coaches.map((coach) => (
                        <option key={coach} value={coach}>{coach}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-base"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Checklist Table */}
        <div className="overflow-visible rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] px-5 py-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Checklist Matrix</div>
              <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                {isChecklistMatrixPage ? filteredReviews.length : displayedReviews.length} sessions in view
              </h3>
            </div>
            {!isChecklistMatrixPage ? (
              <p className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">Session profile first, then all 13 QA checks</p>
            ) : null}
          </div>
          <div className={`divide-y divide-gray-100 md:hidden ${shouldScrollReviews ? 'max-h-[68rem] overflow-y-auto' : ''}`}>
            {displayedReviews.map((review, index) => {
              const checklistCells = getChecklistMatrixCells(review);
              return (
                <div key={review.id} className="px-4 py-4 space-y-4">
                  <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[17px] font-bold leading-6 tracking-[-0.02em] text-violet-700">{review.learner.name}</div>
                      <span className="rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                        {index + 1}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] leading-5 text-slate-500 break-all">{review.learner.email || '-'}</div>
                    <div className="mt-3 rounded-[18px] border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                      <div className="space-y-1.5 text-[12px] leading-5 text-slate-600">
                        <div className="break-words"><span className="font-semibold text-slate-700">Programme:</span> {review.programme}</div>
                        <div className="break-words"><span className="font-semibold text-slate-700">Coach:</span> {review.coach.name}</div>
                        <div><span className="font-semibold text-slate-700">Meeting:</span> {format(new Date(review.meetingDate || review.lastReviewDate), 'dd MMM yyyy')}</div>
                        <div className="break-words"><span className="font-semibold text-slate-700">Manager:</span> {review.employer?.name || '-'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {checklistCells.map((cell, cellIndex) => (
                      <div key={`${review.id}-${cell.category}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                        <div className="text-[11px] font-semibold leading-4 text-slate-600">
                          {cellIndex + 1}. {cell.category}
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-[12px] font-bold shadow-sm ${qaEvalClasses(cell.evaluation || 'NO')}`}>
                            <i className={`${qaEvalIcon(cell.evaluation || 'NO')} text-sm`}></i>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`hidden w-full md:block ${shouldScrollReviews ? 'max-h-[72rem] overflow-y-auto' : 'overflow-visible'}`}>
            <div className="rounded-b-[30px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 top-0 z-30 w-[21%] bg-[linear-gradient(180deg,#f5f7fb_0%,#e9eef5_100%)] px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-[8px_0_18px_rgba(15,23,42,0.05)]">
                    <div>Session Info</div>
                    <div className="mt-1.5 max-w-[15rem] text-[11px] font-medium normal-case leading-5 tracking-normal text-slate-400">
                      Learner, coach, date, and manager
                    </div>
                  </th>
                  {QA_REPORT_CRITERIA.map((criterion) => (
                    <th
                      key={criterion.category}
                      className="w-[6.07%] bg-[linear-gradient(180deg,#fcfdff_0%,#eef2f7_100%)] px-3 py-4 align-top text-left text-[11px] font-semibold tracking-[-0.01em] text-slate-600"
                      title={criterion.match.join(' / ')}
                    >
                      <div className="min-h-[3.1rem] normal-case text-[11px] font-semibold leading-5 text-slate-700 break-words">
                        {criterion.category}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedReviews.map((review, index) => {
                  const checklistCells = getChecklistMatrixCells(review);
                  const rowSurface = index % 2 === 0 ? 'bg-white' : 'bg-slate-50/55';
                  return (
                  <tr key={review.id} className={rowSurface}>
                    <td className={`sticky left-0 z-10 w-[21%] px-4 py-4 align-top shadow-[8px_0_18px_rgba(15,23,42,0.04)] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <button
                        onClick={() => setSelectedLearnerId(review.learner.id)}
                        className="w-full text-left cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-[13px] font-semibold text-violet-700 break-words">{review.learner.name}</div>
                          <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                            {index + 1}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] leading-3.5 text-slate-500 break-all">{review.learner.email || '-'}</div>
                        <div className="mt-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2.5 shadow-sm">
                          <div className="space-y-1 text-[10px] leading-3.5 text-slate-600">
                            <div className="break-words"><span className="font-semibold text-slate-700">Programme:</span> {review.programme}</div>
                            <div className="break-words"><span className="font-semibold text-slate-700">Coach:</span> {review.coach.name}</div>
                            <div><span className="font-semibold text-slate-700">Meeting:</span> {format(new Date(review.meetingDate || review.lastReviewDate), 'dd MMM yyyy')}</div>
                            <div className="break-words"><span className="font-semibold text-slate-700">Manager:</span> {review.employer?.name || '-'}</div>
                          </div>
                        </div>
                      </button>
                    </td>
                    {checklistCells.map((cell) => (
                      <td
                        key={`${review.id}-${cell.category}`}
                        className="w-[6.07%] px-1 py-3 align-middle text-center"
                        title={cell.comments || cell.category}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span
                            aria-label={qaEvalLabel(cell.evaluation || 'NO')}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-[12px] font-bold shadow-sm ${qaEvalClasses(cell.evaluation || 'NO')}`}
                          >
                            <i className={`${qaEvalIcon(cell.evaluation || 'NO')} text-sm`}></i>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const rawDate = review.meetingDate || review.lastReviewDate || '';
                              const parsedDate = rawDate ? new Date(rawDate) : null;
                              setActiveChecklistCellEvidence({
                                learnerName: review.learner.name || 'Unknown Learner',
                                category: cell.category,
                                evaluation: cell.evaluation || 'NO',
                                comments: cell.comments || '',
                                meetingDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? format(parsedDate, 'dd MMM yyyy') : '-',
                                coachName: review.coach.name || '-',
                                managerName: review.employer?.name || '-',
                              });
                            }}
                            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md bg-sky-100 px-1.5 text-[10px] font-bold text-sky-700 shadow-sm"
                            title="View checklist evidence"
                          >
                            E
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {!isChecklistMatrixPage ? (
          <div className="mt-4 flex justify-center">
            <Link
              to="/checklist-matrix"
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              <i className="ri-layout-grid-line"></i>
              View All
            </Link>
          </div>
        ) : null}

      </div>

      {isChecklistMatrixPage && activeChecklistCellEvidence ? (
        <ChecklistCellEvidencePopup item={activeChecklistCellEvidence} onClose={() => setActiveChecklistCellEvidence(null)} />
      ) : null}

      {showSessionReportModal && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowSessionReportModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-2xl">
              <div className="border-b border-slate-200 bg-white px-6 py-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">{QA_REPORT_TITLE}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Inspection-ready report view</p>
                </div>
                <button
                  onClick={() => setShowSessionReportModal(false)}
                  className="h-8 w-8 rounded-lg text-slate-500 transition hover:bg-slate-100 cursor-pointer"
                >
                  <i className="ri-close-line text-lg"></i>
                </button>
              </div>

              <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sessions</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{reportMetaComputed.totalSessions}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Coaches</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{reportMetaComputed.uniqueCoaches}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Compliance</p>
                    <p className="mt-1 text-2xl font-semibold text-sky-800">{reportMetaComputed.compliance}%</p>
                  </div>
                </div>
                <div className="w-[28rem] grid grid-cols-2 gap-2">
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Coach</p>
                    <select
                      value={reportCoachFilter}
                      onChange={(e) => {
                        setReportCoachFilter(e.target.value);
                        setActiveReportId(null);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                    >
                      <option value="">Select coach</option>
                      {reportCoachOptions.map((coachName) => (
                        <option key={coachName} value={coachName}>
                          {coachName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Learner</p>
                    <select
                      value={activeReportId || ''}
                      onChange={(e) => setActiveReportId(e.target.value)}
                      disabled={!reportCoachFilter || !reportLearnerOptions.length}
                      className="w-full max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
                    >
                      <option value="">Select learner</option>
                      {reportLearnerOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="max-h-[65vh] overflow-y-auto bg-slate-100 px-6 py-6">
                {activeReportReview ? (
                  <div className="space-y-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-[165px,1fr] overflow-hidden rounded-xl border border-slate-300">
                      <div className="flex h-24 items-center justify-center border-r border-slate-300 bg-white px-2">
                        <img
                          src={reportLogoSrc}
                          alt="Kent Business College logo"
                          className="max-h-[82px] w-full max-w-[190px] object-contain object-center"
                        />
                      </div>
                      <div className="px-6 py-5">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Quality Assurance Report</p>
                        <h4 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">{QA_REPORT_TITLE}</h4>
                      </div>
                    </div>

                    <table className="w-full border border-slate-300 text-sm">
                      <tbody>
                        <tr><td className="w-56 border border-slate-300 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600">Learner</td><td className="border border-slate-300 px-4 py-2.5 text-slate-900">{activeReportReview.learner.name}</td></tr>
                        <tr><td className="border border-slate-300 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600">Coach</td><td className="border border-slate-300 px-4 py-2.5 text-slate-900">{activeReportReview.coach.name}</td></tr>
                        <tr><td className="border border-slate-300 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600">Duration</td><td className="border border-slate-300 px-4 py-2.5 text-slate-900">{typeof activeReportReview.duration === 'number' ? `${Math.round(activeReportReview.duration)} minutes` : '-'}</td></tr>
                        <tr><td className="border border-slate-300 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600">Programme</td><td className="border border-slate-300 px-4 py-2.5 text-slate-900">{activeReportReview.programme}</td></tr>
                        <tr><td className="border border-slate-300 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600">Group</td><td className="border border-slate-300 px-4 py-2.5 text-slate-900">{activeReportReview.group}</td></tr>
                        <tr><td className="border border-slate-300 bg-slate-50 px-4 py-2.5 font-semibold text-slate-600">Session Date</td><td className="border border-slate-300 px-4 py-2.5 text-slate-900">{new Date(activeReportReview.lastReviewDate).toLocaleDateString('en-GB')}</td></tr>
                      </tbody>
                    </table>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <h5 className="mb-2 text-2xl font-bold text-slate-900">Checklist Categories</h5>
                      <p className="mb-4 text-sm leading-6 text-slate-600">Checklist categories returned directly from the database for this session.</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {getQaCriteriaRows(activeReportReview).map((criterion, index) => (
                          <div key={`${criterion.category}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                              {index + 1}
                            </span>
                            <span className="text-base font-semibold leading-6 text-slate-800">{criterion.category}</span>
                          </div>
                        ))}
                        {getQaCriteriaRows(activeReportReview).length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                            No checklist categories returned from the database for this session.
                          </div>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h5 className="mb-2 text-2xl font-bold text-slate-900">Executive Summary</h5>
                      <p className="text-base leading-8 text-slate-800 whitespace-pre-wrap">{activeReportReview.overallJudgement || 'No executive summary available.'}</p>
                    </section>

                    <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-5">
                      <h5 className="mb-2 text-2xl font-bold text-slate-900">Strengths</h5>
                      <ul className="list-disc pl-5 text-base text-slate-800 space-y-1.5">
                        {(activeReportReview.strengths?.length ? activeReportReview.strengths : ['No strengths recorded.']).map((s, i) => (
                          <li key={`str-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </section>

                    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
                      <h5 className="mb-2 text-2xl font-bold text-slate-900">Areas for Development</h5>
                      <ul className="list-disc pl-5 text-base text-slate-800 space-y-1.5">
                        {(activeReportReview.areasForDevelopment?.length ? activeReportReview.areasForDevelopment : ['No areas for development recorded.']).map((s, i) => (
                          <li key={`area-${i}`}>{s}</li>
                        ))}
                      </ul>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h5 className="mb-2 text-2xl font-bold text-slate-900">Overall Professional Judgement</h5>
                      <p className="text-base leading-8 text-slate-800 whitespace-pre-wrap">
                        {activeReportReview.riskNotes || 'This session was reviewed based on available QA and meeting indicators.'}
                      </p>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h5 className="mb-3 text-2xl font-bold text-slate-900">QA Checklist</h5>
                      <table className="w-full border border-slate-300 text-sm">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="border border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700">Category</th>
                            <th className="border border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700">Evaluation (Yes/No/Partial)</th>
                            <th className="border border-slate-300 px-3 py-2.5 text-left font-semibold text-slate-700">Comments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getQaCriteriaRows(activeReportReview).map((item, idx) => (
                            <tr key={`qa-${idx}`}>
                              <td className="border border-slate-300 px-3 py-2.5 text-slate-800">{item.category}</td>
                              <td className="border border-slate-300 px-3 py-2.5">
                                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${qaEvalClasses(item.evaluation)}`}>
                                  {qaEvalLabel(item.evaluation)}
                                </span>
                              </td>
                              <td className="border border-slate-300 px-3 py-2.5 leading-6 text-slate-700">{item.comments || ''}</td>
                            </tr>
                          ))}
                          {getQaCriteriaRows(activeReportReview).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="border border-slate-300 px-3 py-6 text-center text-slate-500">
                                No QA checklist data returned from the database for this session.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Supporting Commentary</p>
                      <div className="space-y-4">
                        <div>
                          <h5 className="mb-2 text-xl font-bold text-slate-800">Strengths</h5>
                          <ul className="list-disc pl-5 text-base text-slate-700 space-y-1">
                            {(activeReportReview.strengths?.length ? activeReportReview.strengths : ['No strengths recorded.']).map((s, i) => (
                              <li key={`follow-str-${i}`}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="mb-2 text-xl font-bold text-slate-800">Areas for Development</h5>
                          <ul className="list-disc pl-5 text-base text-slate-700 space-y-1">
                            {(activeReportReview.areasForDevelopment?.length ? activeReportReview.areasForDevelopment : ['No areas for development recorded.']).map((s, i) => (
                              <li key={`follow-area-${i}`}>{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="mb-2 text-xl font-bold text-slate-800">Overall Professional Judgement</h5>
                          <p className="text-base leading-7 text-slate-700 whitespace-pre-wrap">
                            {activeReportReview.overallJudgement || 'No overall professional judgement available.'}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-5">
                      <h5 className="mb-3 text-2xl font-bold text-slate-900">Overall Rating</h5>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">RAG</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{activePrintableRating.rag || '-'}</p>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Overall QA Score</p>
                          <p className="mt-1 text-lg font-semibold text-slate-900">{activePrintableRating.score || '-'}</p>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">Select coach and learner to preview the report.</div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowSessionReportModal(false)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  onClick={downloadSessionReport}
                  disabled={!activeReportReview}
                  aria-disabled={!activeReportReview}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                    activeReportReview
                      ? 'bg-slate-800 hover:bg-slate-900 cursor-pointer'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedReview && (
        <DetailDrawer review={selectedReview} onClose={() => setShowDetailDrawer(false)} />
      )}
    </div>
  );
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ DueDate Popup ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function DueDatePopup({ review, onClose }: { review: ReviewRecord; onClose: () => void }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(review.nextDueDate);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays >= 0 && diffDays <= 14;
  const statusColor = isOverdue
    ? 'text-red-600 bg-red-50 border-red-200'
    : isDueSoon
    ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-cyan-600 bg-cyan-50 border-cyan-200';
  const statusLabel = isOverdue
    ? `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    : isDueSoon
    ? `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
    : `Due in ${diffDays} days`;

  return (
    <div
      className="absolute z-50 top-full left-0 mt-1 w-64 bg-white rounded-xl border border-gray-200 shadow-lg p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Review</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>
      <div className="text-sm font-semibold text-gray-900 mb-2">
        {format(new Date(review.nextDueDate), 'dd MMMM yyyy')}
      </div>
      <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${statusColor}`}>
        {statusLabel}
      </span>
      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 mb-1">
          <i className="ri-user-line text-gray-400"></i>
          <span>{review.learner.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <i className="ri-user-star-line text-gray-400"></i>
          <span>{review.coach.name}</span>
        </div>
      </div>
    </div>
  );
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Detail Drawer ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function DetailDrawer({ review, onClose }: { review: ReviewRecord; onClose: () => void }) {
  const yesCount = review.checklist.filter((c) => c.evaluation === 'YES').length;
  const partialCount = review.checklist.filter((c) => c.evaluation === 'PARTIAL').length;
  const noCount = review.checklist.filter((c) => c.evaluation === 'NO').length;

  const evalColor = (val: ChecklistStatus) => {
    if (val === 'YES') return 'bg-green-100 text-green-700';
    if (val === 'PARTIAL') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col overflow-hidden border-l border-slate-200">
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 py-5 border-b border-slate-200">
          <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Learner Summary</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{review.learner.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{review.learner.email}</p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Employer', value: review.employer.name, icon: 'ri-building-line' },
              { label: 'Coach', value: review.coach.name, icon: 'ri-user-star-line' },
              { label: 'Programme', value: review.programme, icon: 'ri-book-open-line' },
              { label: 'Group', value: review.group, icon: 'ri-team-line' },
              { label: 'Last Review', value: format(new Date(review.lastReviewDate), 'dd MMM yyyy'), icon: 'ri-calendar-check-line' },
              { label: 'Next Due', value: format(new Date(review.nextDueDate), 'dd MMM yyyy'), icon: 'ri-calendar-line' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <i className={`${item.icon} text-slate-400 text-xs`}></i>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: 'Status',
                content: (
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                    review.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                    review.status === 'BOOKING' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                    review.status === 'AT_RISK' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    'bg-red-100 text-red-700 border-red-200'
                  }`}>
                    {review.status === 'COMPLETED' ? 'Completed' : review.status === 'BOOKING' ? 'Booking' : review.status === 'AT_RISK' ? 'At Risk' : 'Overdue'}
                  </span>
                ),
              },
              {
                label: 'Attendance',
                content: (
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                    review.attendance === 'ALL_PRESENT' ? 'bg-green-100 text-green-700' :
                    review.attendance === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {review.attendance === 'ALL_PRESENT' ? 'All Present' : review.attendance === 'PARTIAL' ? 'Partial' : 'Missing'}
                  </span>
                ),
              },
              {
                label: 'Signed Off',
                content: (
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${review.signedOff ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {review.signedOff ? 'Yes' : 'No'}
                  </span>
                ),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
                {item.content}
              </div>
            ))}
          </div>

          {review.duration && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="flex items-center gap-2">
                <i className="ri-time-line text-slate-400"></i>
                <span className="text-sm font-medium text-slate-600">Duration</span>
              </div>
              <span className={`text-sm font-semibold ${review.duration < 55 || review.duration > 65 ? 'text-amber-600' : 'text-slate-800'}`}>
                {formatDurationMinutes(review.duration)}
              </span>
            </div>
          )}

          {(review.overallJudgement || (review.strengths && review.strengths.length > 0) || (review.areasForDevelopment && review.areasForDevelopment.length > 0)) && (
            <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-4 shadow-sm">
              <h4 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-800">
                <i className="ri-file-text-line text-sky-600"></i>
                Review Report
              </h4>
              {review.overallJudgement && (
                <p className="mb-4 text-sm leading-7 text-slate-700">{review.overallJudgement}</p>
              )}
              {review.strengths?.length > 0 && (
                <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                  <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                    {review.strengths.slice(0, 5).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.areasForDevelopment?.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Areas For Development</p>
                  <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                    {review.areasForDevelopment.slice(0, 5).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {review.actions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">Priority Actions</h4>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500 border border-slate-200">{review.actions.length} action(s)</span>
              </div>
              <div className="space-y-2">
                {review.actions.map((action) => (
                  <div key={action.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                    <p className="mb-1.5 text-xs font-medium text-slate-800">{action.action}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full font-semibold">
                        {action.owner}
                      </span>
                      {action.dueDate && <span>Due {format(new Date(action.dueDate), 'dd MMM yyyy')}</span>}
                      <span className={`px-1.5 py-0.5 rounded-full font-semibold ${action.status === 'DONE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {action.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}


