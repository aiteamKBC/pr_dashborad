import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { dashboardApi } from '../api/dashboard-api';
import { getLearners, getLearnerById, getLearnerReviews } from '../api/learners-api';
import { reviewsApi } from '../api/reviews-api';
import { notificationsApi } from '../api/notifications-api';
import { settingsApi } from '../api/settings-api';
import { mockNotificationsApi } from '../../../shared/lib/mock-notifications';
import { mockSettingsApi } from '../../../shared/lib/mock-settings';
import KPICard from '../components/KPICard';
import DueSoonPanel from '../components/DueSoonPanel';
import OverduePanel from '../components/OverduePanel';
import RecentReviewsTable from '../components/RecentReviewsTable';
import LearnersTable from '../components/LearnersTable';
import LearnersFilterBar from '../components/LearnersFilterBar';
import LearnerHeader from '../components/LearnerHeader';
import StatusTimeline from '../components/StatusTimeline';
import NextReviewPanel from '../components/NextReviewPanel';
import ReviewHistoryTable from '../components/ReviewHistoryTable';
import ActionModal from '../components/ActionModal';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Button from '../../../shared/components/Button';
import Card from '../../../shared/components/Card';
import Badge from '../../../shared/components/Badge';
import { useToast } from '../../../shared/hooks/useToast';
import { calculateComplianceScore, calculateRiskFlags, getStatusBadgeColor, formatRiskFlag, getRiskBadgeColor } from '../../../shared/utils/review-calculations';
import type { NotificationType, NotificationPriority } from '../../../shared/types/notification';
import type { SystemSettings } from '../../../shared/types/settings';
import type { LearnerListParams } from '../../../shared/types/learner';
import {
  Step1Participants,
  Step2Evidence,
  Step3Checklist,
  Step4Actions,
} from '../components/ReviewFormSteps';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ReviewFormData } from '../types/review-form';

const useMockData = import.meta.env.VITE_USE_MOCK === 'true';
const notifApi = useMockData ? mockNotificationsApi : notificationsApi;
const setApi = useMockData ? mockSettingsApi : settingsApi;

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'learners' | 'learner-profile' | 'review-details' | 'create-review' | 'edit-review' | 'notifications' | 'settings';

type NotificationTypeFilter = NotificationType | 'ALL';

// ─── Notification helpers ─────────────────────────────────────────────────────
const typeLabels: Record<NotificationType, string> = {
  DUE_SOON: 'Due Soon',
  OVERDUE: 'Overdue',
  PENDING_SIGNOFF: 'Pending Sign-off',
  ACTION_DUE: 'Action Due',
  CYCLE_REMINDER: 'Cycle Reminder',
};
const typeColors: Record<NotificationType, string> = {
  DUE_SOON: 'bg-amber-100 text-amber-800 border-amber-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
  PENDING_SIGNOFF: 'bg-teal-100 text-teal-800 border-teal-200',
  ACTION_DUE: 'bg-orange-100 text-orange-800 border-orange-200',
  CYCLE_REMINDER: 'bg-gray-100 text-gray-800 border-gray-200',
};
const priorityColors: Record<NotificationPriority, string> = {
  HIGH: 'text-red-600',
  MEDIUM: 'text-amber-600',
  LOW: 'text-gray-600',
};

// ─── Review form schema ───────────────────────────────────────────────────────
const reviewFormSchema = z.object({
  learner: z.object({ name: z.string().min(1), email: z.string().email() }),
  coach: z.object({ name: z.string().min(1), email: z.string().email() }),
  employer: z.object({ name: z.string().min(1), email: z.string().email() }),
  meetingDate: z.string().min(1),
  meetingTime: z.string().min(1),
  meetingType: z.enum(['teams', 'in-person', 'phone', 'zoom']),
  location: z.string(),
  durationMinutes: z.number().min(1),
  programme: z.string(),
  group: z.string(),
  progressNotes: z.string().min(10),
  otjHoursSinceLastReview: z.number().min(0),
  otjHoursTotal: z.number().min(0),
  otjEvidence: z.string(),
  learnerLearningNotes: z.string(),
  employerFeedbackNotes: z.string(),
  safeguarding: z.object({ completed: z.boolean(), notes: z.string() }),
  supportNeeds: z.object({ identified: z.boolean(), riskSummary: z.string(), mitigationActions: z.string() }),
  checklist: z.array(z.object({ code: z.string(), title: z.string(), status: z.enum(['YES', 'PARTIAL', 'NO', '']), comment: z.string() })),
  strengths: z.string(),
  areasForDevelopment: z.string(),
  overallJudgement: z.string(),
  actions: z.array(z.object({ id: z.string(), owner: z.enum(['LEARNER', 'EMPLOYER', 'COACH']), actionText: z.string(), dueDate: z.string().nullable(), linkedGap: z.string().nullable(), status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']) })),
  signOff: z.object({ learnerSignedAt: z.string().nullable(), employerSignedAt: z.string().nullable(), coachSignedAt: z.string().nullable() }),
});

const FORM_SECTIONS = [
  { id: 'participants', label: 'Participants & Meeting', icon: 'ri-team-line' },
  { id: 'evidence', label: 'Evidence & Notes', icon: 'ri-file-text-line' },
  { id: 'checklist', label: 'QA Checklist', icon: 'ri-checkbox-multiple-line' },
  { id: 'actions', label: 'Actions & Sign Off', icon: 'ri-task-line' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const LOGO_SOURCES = ['https://kentbusinesscollege.com/wp-content/uploads/2025/12/header-logo-e1756282001779.png'];

export default function MainPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedLearnerId, setSelectedLearnerId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  const [logoIndex, setLogoIndex] = useState(0);
  const { showToast, ToastContainer } = useToast();

  const logoLoadFailed = logoIndex >= LOGO_SOURCES.length;

  const navItems: { id: Tab; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
    { id: 'learners', label: 'Learners', icon: 'ri-user-line' },
    { id: 'notifications', label: 'Notifications', icon: 'ri-notification-line' },
    { id: 'settings', label: 'Settings', icon: 'ri-settings-3-line' },
  ];

  const goTo = (tab: Tab, learnerId?: string, reviewId?: string) => {
    if (learnerId) setSelectedLearnerId(learnerId);
    if (reviewId) setSelectedReviewId(reviewId);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sidebar-visible tabs only
  const sidebarTabs: Tab[] = ['dashboard', 'learners', 'notifications', 'settings'];

  // Tab title shown in topbar
  const TAB_TITLES: Partial<Record<Tab, string>> = {
    dashboard: 'Dashboard',
    learners: 'Learners',
    'learner-profile': 'Learner Profile',
    'review-details': 'Review Report',
    'create-review': 'New Review',
    'edit-review': 'Edit Review',
    notifications: 'Notifications',
    settings: 'Settings',
  };

  const currentTitle = TAB_TITLES[activeTab] ?? 'Progress Reviews';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ToastContainer />

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-slate-900">

        {/* Logo area — white background so logo colours show correctly */}
        <div className="bg-white px-5 py-4 flex items-center min-h-[72px]">
          {!logoLoadFailed ? (
            <div className="flex min-h-[52px] w-full max-w-[220px] items-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-2 shadow-sm">
              <img
                src={LOGO_SOURCES[logoIndex]}
                alt="Kent Business College"
                className="h-full w-full object-contain object-left"
                onError={() => setLogoIndex(prev => prev + 1)}
              />
            </div>
          ) : (
            <div className="flex min-h-[52px] w-full max-w-[220px] items-center rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-2 shadow-sm">
              <span className="text-sm font-semibold tracking-[0.12em] text-slate-600 uppercase">Kent Business College</span>
            </div>
          )}
        </div>

        {/* Module label */}
        <div className="px-5 py-3 bg-slate-800/60 border-b border-slate-700/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-400">
            Progress Reviews
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">Quality Assurance System</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems
            .filter(item => sidebarTabs.includes(item.id))
            .map(item => {
              const isActive =
                activeTab === item.id ||
                (activeTab === 'learner-profile' && item.id === 'learners') ||
                (activeTab === 'review-details' && item.id === 'dashboard');
              return (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <i className={`${item.icon} text-base flex-shrink-0`}></i>
                  <span>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-5 py-4 border-t border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-400">Kent Business College</p>
          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} — QA Management System
          </p>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-gray-200 px-8 h-16 flex-shrink-0">
          {/* Left: breadcrumb + page title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap">
              <i className="ri-building-4-line text-sm"></i>
              <span>Kent Business College</span>
              <i className="ri-arrow-right-s-line"></i>
            </div>
            <h1 className="text-sm font-semibold text-gray-900 truncate">{currentTitle}</h1>
          </div>

          {/* Right: date + action */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="hidden md:block text-xs text-gray-400 tabular-nums whitespace-nowrap">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
            {(activeTab === 'dashboard' || activeTab === 'learners') && (
              <button
                onClick={() => goTo('create-review')}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer shadow-sm"
              >
                <i className="ri-add-line"></i>
                New Review
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1440px] mx-auto px-8 py-6">
            {activeTab === 'dashboard' && <DashboardTab goTo={goTo} />}
            {activeTab === 'learners' && <LearnersTab goTo={goTo} />}
            {activeTab === 'learner-profile' && selectedLearnerId && (
              <LearnerProfileTab learnerId={selectedLearnerId} goTo={goTo} />
            )}
            {activeTab === 'review-details' && selectedReviewId && (
              <ReviewDetailsTab reviewId={selectedReviewId} goTo={goTo} />
            )}
            {activeTab === 'create-review' && (
              <CreateReviewTab goTo={goTo} showToast={showToast} />
            )}
            {activeTab === 'edit-review' && editReviewId && (
              <EditReviewTab reviewId={editReviewId} goTo={goTo} showToast={showToast} />
            )}
            {activeTab === 'notifications' && <NotificationsTab showToast={showToast} />}
            {activeTab === 'settings' && <SettingsTab showToast={showToast} />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ goTo }: { goTo: (tab: Tab, learnerId?: string, reviewId?: string) => void }) {
  const { data: kpis, isLoading: kpisLoading } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: () => dashboardApi.getDashboardKPIs() });
  const { data: dueSoonLearners, isLoading: dueSoonLoading } = useQuery({ queryKey: ['due-soon-learners'], queryFn: () => dashboardApi.getDueSoonLearners() });
  const { data: overdueLearners, isLoading: overdueLoading } = useQuery({ queryKey: ['overdue-learners'], queryFn: () => dashboardApi.getOverdueLearners() });
  const { data: recentReviews, isLoading: recentLoading } = useQuery({ queryKey: ['recent-reviews'], queryFn: () => dashboardApi.getRecentCompletedReviews() });
  const { data: statusCounts, isLoading: statusLoading } = useQuery({ queryKey: ['status-counts'], queryFn: () => dashboardApi.getStatusCounts() });
  const { data: weeklyTrend, isLoading: trendLoading } = useQuery({ queryKey: ['weekly-trend'], queryFn: () => dashboardApi.getWeeklyTrend() });

  const statusChartData = statusCounts ? [
    { name: 'Not Started', count: statusCounts.notStarted, fill: '#6b7280' },
    { name: 'Due Soon', count: statusCounts.dueSoon, fill: '#f59e0b' },
    { name: 'Overdue', count: statusCounts.overdue, fill: '#ef4444' },
    { name: 'Completed', count: statusCounts.completed, fill: '#22c55e' },
  ] : [];

  return (
    <div>
      {/* Academic context banner */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Tripartite Progress Reviews</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            QA monitoring for all active apprenticeship programmes
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
          <i className="ri-shield-check-line text-teal-600 text-sm"></i>
          <span className="text-xs font-semibold text-teal-700">Quality Assurance Active</span>
        </div>
      </div>

      {kpisLoading ? <LoadingSpinner /> : kpis ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPICard title="Total Learners in Scope" value={kpis.totalLearnersInScope} icon="ri-user-3-line" color="text-teal-600" iconBg="bg-teal-50" />
          <KPICard title="Reviews Due Soon" value={kpis.reviewsDueSoon} icon="ri-time-line" color="text-amber-600" iconBg="bg-amber-50" />
          <KPICard title="Overdue Reviews" value={kpis.overdueReviews} icon="ri-alert-line" color="text-red-600" iconBg="bg-red-50" />
          <KPICard title="Completed This Month" value={kpis.completedThisMonth} icon="ri-checkbox-circle-line" color="text-green-600" iconBg="bg-green-50" />
          <KPICard title="Compliance Rate" value={`${kpis.complianceRate}%`} icon="ri-shield-check-line" color="text-indigo-600" iconBg="bg-indigo-50" />
        </div>
      ) : null}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-amber-50 rounded-lg">
              <i className="ri-time-line text-amber-600 text-sm"></i>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Due Soon – Next 14 Days</h2>
          </div>
          {dueSoonLearners && dueSoonLearners.length > 0 && (
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              {dueSoonLearners.length} {dueSoonLearners.length === 1 ? 'learner' : 'learners'}
            </span>
          )}
        </div>
        {dueSoonLoading ? <LoadingSpinner /> : dueSoonLearners ? <DueSoonPanel learners={dueSoonLearners} /> : null}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-red-50 rounded-lg">
              <i className="ri-alert-line text-red-600 text-sm"></i>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Overdue Reviews</h2>
          </div>
          {overdueLearners && overdueLearners.length > 0 && (
            <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
              {overdueLearners.length} {overdueLearners.length === 1 ? 'learner' : 'learners'}
            </span>
          )}
        </div>
        {overdueLoading ? <LoadingSpinner /> : overdueLearners ? <OverduePanel learners={overdueLearners} /> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Learners by Status</h3>
          {statusLoading ? <LoadingSpinner /> : statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusChartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Completed Reviews – Last 12 Weeks</h3>
          {trendLoading ? <LoadingSpinner /> : weeklyTrend && weeklyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#6b7280' }} />
                <Line type="monotone" dataKey="completedCount" stroke="#14b8a6" strokeWidth={2} name="Completed Reviews" dot={{ fill: '#14b8a6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-teal-50 rounded-lg">
              <i className="ri-file-list-3-line text-teal-600 text-sm"></i>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Recent Completed Reviews</h2>
          </div>
        </div>
        {recentLoading ? <LoadingSpinner /> : recentReviews ? <RecentReviewsTable reviews={recentReviews} /> : null}
      </div>
    </div>
  );
}

// ─── Learners Tab ─────────────────────────────────────────────────────────────
function LearnersTab({ goTo }: { goTo: (tab: Tab, learnerId?: string, reviewId?: string) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters: LearnerListParams = {
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') as any || undefined,
    coach_id: searchParams.get('coach_id') || undefined,
    programme: searchParams.get('programme') || undefined,
    group: searchParams.get('group') || undefined,
    due_date_from: searchParams.get('due_date_from') || undefined,
    due_date_to: searchParams.get('due_date_to') || undefined,
    sort_by: (searchParams.get('sort_by') as any) || 'next_due_date',
    page: parseInt(searchParams.get('page') || '1'),
    page_size: 20,
  };

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['learners', filters], queryFn: () => getLearners(filters) });

  const handleFilterChange = (newFilters: Partial<LearnerListParams>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
      else params.delete(key);
    });
    if (!newFilters.page) params.set('page', '1');
    setSearchParams(params);
  };

  if (isError) return (
    <Card className="p-12 text-center">
      <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load learners</h3>
      <p className="text-sm text-gray-600 mb-6">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
      <button onClick={() => refetch()} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer">Try again</button>
    </Card>
  );

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm text-gray-500">Manage learner profiles and track review schedules</p>
      </div>
      <LearnersFilterBar filters={filters} onFilterChange={handleFilterChange} totalCount={data?.total || 0} />
      {isLoading ? (
        <Card className="p-12"><LoadingSpinner size="lg" /><p className="text-center text-sm text-gray-600 mt-4">Loading learners...</p></Card>
      ) : data && data.items.length > 0 ? (
        <LearnersTable
          learners={data.items}
          total={data.total}
          currentPage={filters.page || 1}
          pageSize={filters.page_size || 20}
          onPageChange={(page) => handleFilterChange({ page })}
          sortBy={filters.sort_by || 'next_due_date'}
          onSortChange={(sort_by) => handleFilterChange({ sort_by })}
        />
      ) : (
        <Card className="p-12 text-center">
          <i className="ri-user-search-line text-5xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No learners found</h3>
          <p className="text-sm text-gray-600 mb-6">Try adjusting your filters</p>
          <button onClick={() => setSearchParams({})} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer">Clear all filters</button>
        </Card>
      )}
    </div>
  );
}

// ─── Learner Profile Tab ──────────────────────────────────────────────────────
function LearnerProfileTab({ learnerId, goTo }: { learnerId: string; goTo: (tab: Tab, learnerId?: string, reviewId?: string) => void }) {
  const { data: learner, isLoading: loadingLearner, error: learnerError, refetch: refetchLearner } = useQuery({ queryKey: ['learner', learnerId], queryFn: () => getLearnerById(learnerId) });
  const { data: reviews, isLoading: loadingReviews, refetch: refetchReviews } = useQuery({ queryKey: ['learner-reviews', learnerId], queryFn: () => getLearnerReviews(learnerId) });

  if (loadingLearner || loadingReviews) return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (learnerError || !learner) return (
    <div className="flex flex-col items-center justify-center py-24">
      <i className="ri-error-warning-line text-5xl text-red-500 mb-4"></i>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Learner</h2>
      <div className="flex gap-3 mt-4">
        <button onClick={() => { refetchLearner(); refetchReviews(); }} className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg whitespace-nowrap cursor-pointer">Try Again</button>
        <button onClick={() => goTo('learners')} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg whitespace-nowrap cursor-pointer">Back to Learners</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => goTo('learners')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap"
        >
          <i className="ri-arrow-left-line text-xs"></i>
          Learners
        </button>
        <i className="ri-arrow-right-s-line text-gray-400 text-sm"></i>
        <span className="text-sm text-gray-700 font-medium">Learner Profile</span>
        <div className="ml-auto">
          <button
            onClick={() => goTo('create-review')}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-calendar-line"></i>
            Schedule Review
          </button>
        </div>
      </div>
      <div className="space-y-6">
        <LearnerHeader learner={learner} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <StatusTimeline learner={learner} />
            <ReviewHistoryTable reviews={reviews || []} />
          </div>
          <div className="lg:col-span-1">
            <NextReviewPanel learner={learner} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Review Details Tab ───────────────────────────────────────────────────────
function ReviewDetailsTab({ reviewId, goTo }: { reviewId: string; goTo: (tab: Tab, learnerId?: string, reviewId?: string) => void }) {
  const { data: review, isLoading } = useQuery({ queryKey: ['review', reviewId], queryFn: () => reviewsApi.getReview(reviewId) });

  if (isLoading) return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (!review) return <div className="p-8 text-center text-gray-500">Review not found</div>;

  const complianceScore = calculateComplianceScore(review.evaluations);
  const riskFlags = calculateRiskFlags(review);
  const signOffComplete = review.signOff.learnerSignedAt && review.signOff.employerSignedAt && review.signOff.coachSignedAt;
  const actionsByOwner = {
    LEARNER: review.actions.filter(a => a.ownerType === 'LEARNER'),
    EMPLOYER: review.actions.filter(a => a.ownerType === 'EMPLOYER'),
    COACH: review.actions.filter(a => a.ownerType === 'COACH'),
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => goTo('dashboard')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line text-xs"></i>
            Dashboard
          </button>
          <i className="ri-arrow-right-s-line text-gray-400 text-sm"></i>
          <span className="text-sm text-gray-700 font-medium">Review Report</span>
          <span className="text-xs text-gray-400 font-mono ml-1">#{review.id.slice(0, 8)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-file-pdf-line"></i>
            Export PDF
          </button>
          <button
            onClick={() => goTo('edit-review', undefined, reviewId)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className="ri-edit-line"></i>
            Edit Review
          </button>
        </div>
      </div>

      {/* Metadata */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Review Metadata</h2>
            <p className="text-sm text-gray-500">Completed on {format(new Date(review.reviewDateTime), 'dd MMMM yyyy')}</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Compliance Score</p>
              <Badge variant={complianceScore >= 80 ? 'success' : complianceScore >= 60 ? 'warning' : 'danger'} className="text-sm px-3 py-1">{complianceScore}%</Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Sign-off</p>
              <Badge variant={signOffComplete ? 'success' : 'warning'}>{signOffComplete ? 'Complete' : 'Pending'}</Badge>
            </div>
          </div>
        </div>
        {riskFlags.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-900 mb-2"><i className="ri-alert-line mr-1"></i>Risk Flags</p>
            <div className="flex flex-wrap gap-2">{riskFlags.map(flag => <Badge key={flag} className={getRiskBadgeColor(flag)}>{formatRiskFlag(flag)}</Badge>)}</div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { label: 'Programme', value: review.programme },
            { label: 'Group', value: review.group },
            { label: 'Review Date', value: format(new Date(review.reviewDateTime), 'dd MMM yyyy HH:mm') },
            { label: 'Duration', value: `${review.durationMinutes} minutes` },
            { label: 'OTJ Hours Reviewed', value: `${review.otjHoursReviewed} hrs` },
            { label: 'OTJ Hours Value', value: `${review.otjHoursValue} hrs` },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="text-sm font-medium text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Participants */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Participants</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Learner', name: review.learner.name, email: review.learner.email, bg: 'bg-teal-50 border-teal-200', icon: 'ri-user-line text-teal-600', iconBg: 'bg-teal-600' },
            { label: 'Employer / Line Manager', name: review.employer.name, email: review.employer.email, bg: 'bg-green-50 border-green-200', icon: 'ri-briefcase-line text-green-600', iconBg: 'bg-green-600' },
            { label: 'Skills Coach', name: review.coach.name, email: review.coach.email, bg: 'bg-orange-50 border-orange-200', icon: 'ri-user-star-line text-orange-600', iconBg: 'bg-orange-600' },
          ].map(p => (
            <div key={p.label} className={`rounded-lg p-4 border ${p.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 ${p.iconBg} rounded-full flex items-center justify-center`}>
                  <i className={`${p.icon.split(' ')[0]} text-white`}></i>
                </div>
                <p className="text-xs font-medium text-gray-600">{p.label}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{p.name}</p>
              <p className="text-xs text-gray-500">{p.email}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* QA Checklist */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">QA Checklist (13 Criteria)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Criterion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 w-24">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {review.evaluations.map((ev, i) => (
                <tr key={ev.criterionCode} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{ev.criterionTitle}</td>
                  <td className="px-4 py-3"><Badge className={getStatusBadgeColor(ev.status)}>{ev.status}</Badge></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ev.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Narrative */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Narrative Assessment</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            { label: 'Strengths', value: review.strengths, bg: 'bg-green-50 border-green-200', icon: 'ri-thumb-up-line text-green-600', titleColor: 'text-green-900' },
            { label: 'Areas for Development', value: review.areasForDevelopment, bg: 'bg-amber-50 border-amber-200', icon: 'ri-lightbulb-line text-amber-600', titleColor: 'text-amber-900' },
            { label: 'Overall Professional Judgement', value: review.overallJudgement, bg: 'bg-teal-50 border-teal-200', icon: 'ri-file-text-line text-teal-600', titleColor: 'text-teal-900' },
          ].map(n => (
            <div key={n.label} className={`rounded-lg p-4 border ${n.bg}`}>
              <div className="flex items-center gap-2 mb-3">
                <i className={n.icon}></i>
                <h3 className={`text-sm font-semibold ${n.titleColor}`}>{n.label}</h3>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{n.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* SMART Actions */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">SMART Actions</h2>
        {Object.entries(actionsByOwner).map(([owner, actions]) => (
          <div key={owner} className="mb-5 last:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${owner === 'LEARNER' ? 'bg-teal-100' : owner === 'EMPLOYER' ? 'bg-green-100' : 'bg-orange-100'}`}>
                <i className={`${owner === 'LEARNER' ? 'ri-user-line text-teal-600' : owner === 'EMPLOYER' ? 'ri-briefcase-line text-green-600' : 'ri-user-star-line text-orange-600'} text-sm`}></i>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{owner}</h3>
              <span className="text-xs text-gray-500">({actions.length} actions)</span>
            </div>
            {actions.length === 0 ? <p className="text-sm text-gray-400 ml-9">No actions assigned</p> : (
              <div className="space-y-2 ml-9">
                {actions.map(action => (
                  <div key={action.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm text-gray-900 flex-1 font-medium">{action.actionText}</p>
                      <Badge variant={action.status === 'DONE' ? 'success' : action.status === 'IN_PROGRESS' ? 'warning' : 'default'}>{action.status.replace('_', ' ')}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {action.linkedKsb && <span><i className="ri-bookmark-line mr-1"></i>KSB: {action.linkedKsb}</span>}
                      {action.dueDate && <span><i className="ri-calendar-line mr-1"></i>Due: {format(new Date(action.dueDate), 'dd MMM yyyy')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Sign-off */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Sign-off Confirmation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Learner', key: 'learnerSignedAt', bg: 'bg-teal-50 border-teal-200', icon: 'ri-user-line text-teal-600' },
            { label: 'Employer', key: 'employerSignedAt', bg: 'bg-green-50 border-green-200', icon: 'ri-briefcase-line text-green-600' },
            { label: 'Skills Coach', key: 'coachSignedAt', bg: 'bg-orange-50 border-orange-200', icon: 'ri-user-star-line text-orange-600' },
          ].map(p => {
            const signed = review.signOff[p.key as keyof typeof review.signOff];
            return (
              <div key={p.label} className={`rounded-lg p-4 border ${p.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <i className={p.icon}></i>
                  <p className="text-sm font-medium text-gray-900">{p.label}</p>
                </div>
                {signed ? (
                  <>
                    <Badge variant="success" className="mb-2"><i className="ri-checkbox-circle-line mr-1"></i>Signed</Badge>
                    <p className="text-xs text-gray-500">{format(new Date(signed as string), 'dd MMM yyyy HH:mm')}</p>
                  </>
                ) : <Badge variant="warning"><i className="ri-time-line mr-1"></i>Pending</Badge>}
              </div>
            );
          })}
        </div>
        {signOffComplete && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
            <i className="ri-checkbox-circle-fill text-green-600 text-lg"></i>
            <p className="text-sm font-medium text-green-900">Review fully signed off and completed</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Create Review Tab ────────────────────────────────────────────────────────
function CreateReviewTab({ goTo, showToast }: { goTo: (tab: Tab) => void; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      learner: { name: '', email: '' }, coach: { name: '', email: '' }, employer: { name: '', email: '' },
      meetingDate: '', meetingTime: '', meetingType: 'teams', location: '', durationMinutes: 60,
      programme: '', group: '', progressNotes: '', otjHoursSinceLastReview: 0, otjHoursTotal: 0,
      otjEvidence: '', learnerLearningNotes: '', employerFeedbackNotes: '',
      safeguarding: { completed: false, notes: '' }, supportNeeds: { identified: false, riskSummary: '', mitigationActions: '' },
      checklist: Array(13).fill({ code: '', title: '', status: '', comment: '' }),
      strengths: '', areasForDevelopment: '', overallJudgement: '', actions: [],
      signOff: { learnerSignedAt: null, employerSignedAt: null, coachSignedAt: null },
    },
  });

  const handleSaveDraft = () => {
    localStorage.setItem('review-draft', JSON.stringify(form.getValues()));
    showToast('Draft saved successfully', 'success');
  };

  const onSubmit = async (data: ReviewFormData) => {
    const errors: string[] = [];
    if (!data.meetingDate) errors.push('Meeting date is required');
    if (!data.progressNotes || data.progressNotes.length < 10) errors.push('Progress notes are required');
    if (data.checklist.some(c => c.status === '')) errors.push('All 13 QA criteria must be evaluated');
    if (!data.signOff.learnerSignedAt || !data.signOff.employerSignedAt || !data.signOff.coachSignedAt) errors.push('All three parties must sign off');
    if (errors.length > 0) { showToast(errors[0], 'error'); return; }
    setIsSaving(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      localStorage.removeItem('review-draft');
      showToast('Review created successfully', 'success');
      goTo('dashboard');
    } catch { showToast('Failed to create review', 'error'); }
    finally { setIsSaving(false); }
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => goTo('dashboard')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer whitespace-nowrap">
            <i className="ri-arrow-left-line"></i> Back
          </button>
          <div className="h-5 w-px bg-gray-300" />
          <h1 className="text-xl font-semibold text-gray-900">Create Tripartite Progress Review</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleSaveDraft} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap cursor-pointer">
            <i className="ri-save-line mr-1"></i> Save Draft
          </button>
          <button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer">
            {isSaving ? <><i className="ri-loader-4-line animate-spin"></i> Saving...</> : <><i className="ri-check-line"></i> Complete Review</>}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <div className="sticky top-20 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sections</p>
            </div>
            <nav className="p-2 space-y-1">
              {FORM_SECTIONS.map(s => (
                <button key={s.id} type="button" onClick={() => scrollTo(s.id)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-teal-50 hover:text-teal-700 transition-colors cursor-pointer text-left">
                  <i className={s.icon}></i> {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {[
              { id: 'participants', label: 'Participants & Meeting', icon: 'ri-team-line', content: <Step1Participants form={form} /> },
              { id: 'evidence', label: 'Evidence & Notes', icon: 'ri-file-text-line', content: <Step2Evidence form={form} /> },
              { id: 'checklist', label: 'QA Checklist', icon: 'ri-checkbox-multiple-line', content: <Step3Checklist form={form} /> },
              { id: 'actions', label: 'SMART Actions & Sign Off', icon: 'ri-task-line', content: <Step4Actions form={form} /> },
            ].map(section => (
              <div key={section.id} id={section.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50">
                  <div className="w-8 h-8 flex items-center justify-center bg-teal-100 rounded-full">
                    <i className={`${section.icon} text-teal-700 text-sm`}></i>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900">{section.label}</h2>
                </div>
                <div className="p-6">{section.content}</div>
              </div>
            ))}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between">
              <button type="button" onClick={handleSaveDraft} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap cursor-pointer">
                <i className="ri-save-line mr-1"></i> Save Draft
              </button>
              <button type="submit" disabled={isSaving} className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer">
                {isSaving ? <><i className="ri-loader-4-line animate-spin"></i> Creating...</> : <><i className="ri-check-line"></i> Complete Review</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Review Tab ──────────────────────────────────────────────────────────
function EditReviewTab({ reviewId, goTo, showToast }: { reviewId: string; goTo: (tab: Tab, learnerId?: string, reviewId?: string) => void; showToast: (msg: string, type: 'success' | 'error') => void }) {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [signOff, setSignOff] = useState<any>({});
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);

  const editSchema = z.object({
    programme: z.string().min(1), group: z.string().min(1),
    learnerName: z.string().min(1), learnerEmail: z.string().email(),
    employerName: z.string().min(1), employerEmail: z.string().email(),
    coachName: z.string().min(1), coachEmail: z.string().email(),
    reviewDateTime: z.string().min(1), dueDateTime: z.string().min(1),
    durationMinutes: z.number().min(1), otjHoursReviewed: z.number().min(0), otjHoursValue: z.number().min(0),
    strengths: z.string().min(10), areasForDevelopment: z.string().min(10), overallJudgement: z.string().min(10),
  });
  type EditFormData = z.infer<typeof editSchema>;

  const { data: review, isLoading } = useQuery({
    queryKey: ['review', reviewId],
    queryFn: () => reviewsApi.getReview(reviewId),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    values: review ? {
      programme: review.programme, group: review.group,
      learnerName: review.learner.name, learnerEmail: review.learner.email,
      employerName: review.employer.name, employerEmail: review.employer.email,
      coachName: review.coach.name, coachEmail: review.coach.email,
      reviewDateTime: review.reviewDateTime.slice(0, 16), dueDateTime: review.dueDateTime.slice(0, 16),
      durationMinutes: review.durationMinutes, otjHoursReviewed: review.otjHoursReviewed, otjHoursValue: review.otjHoursValue,
      strengths: review.strengths, areasForDevelopment: review.areasForDevelopment, overallJudgement: review.overallJudgement,
    } : undefined,
  });

  useState(() => {
    if (review) { setEvaluations(review.evaluations); setActions(review.actions); setSignOff(review.signOff); }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
      await reviewsApi.updateReview(reviewId, {
        programme: data.programme, group: data.group,
        learner: { id: review!.learner.id, name: data.learnerName, email: data.learnerEmail },
        employer: { name: data.employerName, email: data.employerEmail },
        coach: { id: review!.coach.id, name: data.coachName, email: data.coachEmail },
        reviewDateTime: new Date(data.reviewDateTime).toISOString(), dueDateTime: new Date(data.dueDateTime).toISOString(),
        durationMinutes: data.durationMinutes, otjHoursReviewed: data.otjHoursReviewed, otjHoursValue: data.otjHoursValue,
        strengths: data.strengths, areasForDevelopment: data.areasForDevelopment, overallJudgement: data.overallJudgement,
      });
      await reviewsApi.updateEvaluations(reviewId, evaluations);
      await reviewsApi.signOff(reviewId, signOff);
    },
    onSuccess: () => { showToast('Review updated successfully', 'success'); setTimeout(() => goTo('review-details', undefined, reviewId), 1200); },
    onError: () => showToast('Failed to update review', 'error'),
  });

  const handleEvalChange = (code: string, field: string, value: any) => setEvaluations(prev => prev.map(e => e.criterionCode === code ? { ...e, [field]: value } : e));
  const handleSignOff = (party: 'learner' | 'employer' | 'coach') => {
    const key = `${party}SignedAt`;
    setSignOff((prev: any) => ({ ...prev, [key]: prev[key] ? null : new Date().toISOString() }));
  };
  const handleSaveAction = async (action: any) => {
    if (editingAction) {
      await reviewsApi.updateAction(editingAction.id, action);
      setActions(prev => prev.map(a => a.id === editingAction.id ? { ...a, ...action } : a));
      showToast('Action updated', 'success');
    } else {
      const newAction = await reviewsApi.createAction(reviewId, action);
      setActions(prev => [...prev, newAction]);
      showToast('Action created', 'success');
    }
    setShowActionModal(false); setEditingAction(null);
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (!review) return <div className="p-8 text-center text-gray-500">Review not found</div>;

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => goTo('review-details', undefined, reviewId)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer whitespace-nowrap">
          <i className="ri-arrow-left-line"></i> Back
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <h1 className="text-xl font-semibold text-gray-900">Edit Review</h1>
        <p className="text-xs text-gray-500">ID: {review.id}</p>
      </div>

      <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Programme', name: 'programme' }, { label: 'Group', name: 'group' },
              { label: 'Review Date & Time', name: 'reviewDateTime', type: 'datetime-local' },
              { label: 'Due Date & Time', name: 'dueDateTime', type: 'datetime-local' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type={f.type || 'text'} {...register(f.name as any)} className={inputCls} />
                {errors[f.name as keyof typeof errors] && <p className="text-xs text-red-600 mt-1">{(errors[f.name as keyof typeof errors] as any)?.message}</p>}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" {...register('durationMinutes', { valueAsNumber: true })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTJ Hours Reviewed</label>
              <input type="number" {...register('otjHoursReviewed', { valueAsNumber: true })} className={inputCls} />
            </div>
          </div>
        </Card>

        {/* Participants */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['learner', 'employer', 'coach'] as const).map(party => (
              <div key={party}>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 capitalize">{party}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input {...register(`${party}Name` as any)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input {...register(`${party}Email` as any)} className={inputCls} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Criteria */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Criteria Evaluation</h2>
          <div className="space-y-3">
            {evaluations.map(ev => (
              <div key={ev.criterionCode} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-2">{ev.criterionTitle}</p>
                    <textarea value={ev.comment} onChange={e => handleEvalChange(ev.criterionCode, 'comment', e.target.value)} className={inputCls} rows={2} placeholder="Add comment..." />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {(['YES', 'PARTIAL', 'NO'] as const).map(s => (
                      <button key={s} type="button" onClick={() => handleEvalChange(ev.criterionCode, 'status', s)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${ev.status === s ? s === 'YES' ? 'bg-green-600 text-white' : s === 'PARTIAL' ? 'bg-amber-600 text-white' : 'bg-red-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Narrative */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Narrative</h2>
          <div className="space-y-4">
            {[
              { label: 'Strengths', name: 'strengths' },
              { label: 'Areas for Development', name: 'areasForDevelopment' },
              { label: 'Overall Judgement', name: 'overallJudgement' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <textarea {...register(f.name as any)} className={inputCls} rows={4} />
                {errors[f.name as keyof typeof errors] && <p className="text-xs text-red-600 mt-1">{(errors[f.name as keyof typeof errors] as any)?.message}</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">SMART Actions</h2>
            <button type="button" onClick={() => { setEditingAction(null); setShowActionModal(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 whitespace-nowrap cursor-pointer">
              <i className="ri-add-line"></i> Add Action
            </button>
          </div>
          <div className="space-y-3">
            {actions.map(action => (
              <div key={action.id} className="bg-gray-50 rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-900 mb-1">{action.actionText}</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>Owner: {action.ownerType}</span>
                    {action.dueDate && <span>Due: {action.dueDate}</span>}
                    <span>Status: {action.status}</span>
                  </div>
                </div>
                <button type="button" onClick={() => { setEditingAction(action); setShowActionModal(true); }} className="text-teal-600 hover:text-teal-700 text-sm cursor-pointer whitespace-nowrap ml-4">Edit</button>
              </div>
            ))}
          </div>
        </Card>

        {/* Sign-off */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Sign-off</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['learner', 'employer', 'coach'] as const).map(party => {
              const key = `${party}SignedAt`;
              const isSigned = signOff[key];
              return (
                <div key={party} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3 capitalize">{party}</p>
                  <button type="button" onClick={() => handleSignOff(party)} className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap cursor-pointer transition-colors ${isSigned ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-teal-600 text-white hover:bg-teal-700'}`}>
                    {isSigned ? 'Remove Sign-off' : 'Mark Signed Now'}
                  </button>
                  {isSigned && <p className="text-xs text-gray-500 mt-2">Signed: {new Date(isSigned).toLocaleString('en-GB')}</p>}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => goTo('review-details', undefined, reviewId)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap cursor-pointer">Cancel</button>
          <button type="submit" disabled={updateMutation.isPending} className="px-6 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 whitespace-nowrap cursor-pointer">
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {showActionModal && (
        <ActionModal
          action={editingAction}
          onSave={handleSaveAction}
          onDelete={editingAction ? () => { setActions(prev => prev.filter(a => a.id !== editingAction.id)); setShowActionModal(false); setEditingAction(null); showToast('Action deleted', 'success'); } : undefined}
          onClose={() => { setShowActionModal(false); setEditingAction(null); }}
        />
      )}
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<NotificationTypeFilter>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['notification-stats'], queryFn: () => notifApi.getStats() });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notifications', selectedType, showUnreadOnly],
    queryFn: () => notifApi.getNotifications({ type: selectedType === 'ALL' ? undefined : selectedType, read: showUnreadOnly ? false : undefined, page: 1, page_size: 50 }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notifApi.markAsRead(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notification-stats'] }); },
  });
  const markAllMutation = useMutation({
    mutationFn: () => notifApi.markAllAsRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notification-stats'] }); showToast('All notifications marked as read', 'success'); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notifApi.deleteNotification(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notification-stats'] }); showToast('Notification deleted', 'success'); },
  });

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  if (isLoading) return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <i className="ri-error-warning-line text-4xl text-red-600 mb-3"></i>
      <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Notifications</h3>
      <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap cursor-pointer">Try Again</button>
    </div>
  );

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending} className="px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50">
            <i className="ri-check-double-line mr-2"></i>Mark All as Read
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <button onClick={() => setSelectedType('ALL')} className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${selectedType === 'ALL' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600 mt-0.5">All</div>
            {stats.unread > 0 && <div className="text-xs text-teal-600 font-medium">{stats.unread} unread</div>}
          </button>
          {stats.byType.map(item => (
            <button key={item.type} onClick={() => setSelectedType(item.type)} className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${selectedType === item.type ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <div className="text-xl font-bold text-gray-900">{item.count}</div>
              <div className="text-xs text-gray-600 mt-0.5">{typeLabels[item.type]}</div>
              {item.unreadCount > 0 && <div className="text-xs text-teal-600 font-medium">{item.unreadCount} unread</div>}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4">
        <label className="flex items-center cursor-pointer">
          <input type="checkbox" checked={showUnreadOnly} onChange={e => setShowUnreadOnly(e.target.checked)} className="w-4 h-4 text-teal-600 border-gray-300 rounded" />
          <span className="ml-2 text-sm font-medium text-gray-700">Show unread only</span>
        </label>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <i className="ri-notification-off-line text-5xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
          <p className="text-sm text-gray-500">You have no notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div key={n.id} onClick={() => { if (!n.readAt) markAsReadMutation.mutate(n.id); }} className={`bg-white rounded-lg border-2 p-4 transition-all cursor-pointer ${n.readAt ? 'border-gray-200 hover:border-gray-300' : 'border-teal-200 bg-teal-50/20 hover:border-teal-300'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[n.type]}`}>{typeLabels[n.type]}</span>
                    <span className={`text-xs font-medium ${priorityColors[n.priority]}`}>{n.priority === 'HIGH' && <i className="ri-alert-fill mr-1"></i>}{n.priority}</span>
                    {!n.readAt && <span className="w-2 h-2 bg-teal-600 rounded-full"></span>}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{n.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{n.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span><i className="ri-time-line mr-1"></i>{formatDate(n.createdAt)}</span>
                    {n.learnerName && <span><i className="ri-user-line mr-1"></i>{n.learnerName}</span>}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ showToast }: { showToast: (msg: string, type: 'success' | 'error') => void }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cycle' | 'notifications' | 'checklist'>('cycle');
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  const { data: settings, isLoading, error, refetch } = useQuery({ queryKey: ['settings'], queryFn: () => setApi.getSettings() });

  if (settings && !localSettings) setLocalSettings(JSON.parse(JSON.stringify(settings)));

  const updateMutation = useMutation({
    mutationFn: (s: Partial<SystemSettings>) => setApi.updateSettings(s),
    onSuccess: (data) => { queryClient.setQueryData(['settings'], data); setLocalSettings(JSON.parse(JSON.stringify(data))); setHasChanges(false); showToast('Settings saved successfully', 'success'); },
    onError: () => showToast('Failed to save settings', 'error'),
  });
  const resetMutation = useMutation({
    mutationFn: () => setApi.resetToDefaults(),
    onSuccess: (data) => { queryClient.setQueryData(['settings'], data); setLocalSettings(JSON.parse(JSON.stringify(data))); setHasChanges(false); showToast('Settings reset to defaults', 'success'); },
    onError: () => showToast('Failed to reset settings', 'error'),
  });

  const update = (updates: Partial<SystemSettings>) => { if (localSettings) { setLocalSettings({ ...localSettings, ...updates }); setHasChanges(true); } };

  if (isLoading) return <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" /></div>;
  if (error || !localSettings) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <i className="ri-error-warning-line text-4xl text-red-600 mb-3"></i>
      <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Settings</h3>
      <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap cursor-pointer">Try Again</button>
    </div>
  );

  const inputCls = "w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">System Settings</h1>
        <p className="text-sm text-gray-500">Configure review cycle, notifications, and QA checklist</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {[
            { id: 'cycle', label: 'Review Cycle', icon: 'ri-calendar-line' },
            { id: 'notifications', label: 'Email Notifications', icon: 'ri-notification-line' },
            { id: 'checklist', label: 'QA Checklist', icon: 'ri-checkbox-line' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap cursor-pointer ${activeTab === t.id ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}>
              <i className={`${t.icon} mr-2`}></i>{t.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'cycle' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Review Cycle Configuration</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Cycle Duration (weeks)</label>
                <input type="number" min="1" max="52" value={localSettings.reviewCycle.cycleDurationWeeks} onChange={e => update({ reviewCycle: { ...localSettings.reviewCycle, cycleDurationWeeks: parseInt(e.target.value) || 10 } })} className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">Expected time between reviews (default: 10 weeks)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Reminder Window Start (weeks)</label>
                <input type="number" min="1" max={localSettings.reviewCycle.cycleDurationWeeks} value={localSettings.reviewCycle.reminderWindowWeeks} onChange={e => update({ reviewCycle: { ...localSettings.reviewCycle, reminderWindowWeeks: parseInt(e.target.value) || 8 } })} className={inputCls} />
                <p className="text-xs text-gray-500 mt-1">When to start showing "Due soon" alerts (default: 8 weeks)</p>
              </div>
              <div>
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" checked={localSettings.reviewCycle.autoRemindersEnabled} onChange={e => update({ reviewCycle: { ...localSettings.reviewCycle, autoRemindersEnabled: e.target.checked } })} className="w-4 h-4 text-teal-600 border-gray-300 rounded" />
                  <span className="ml-2 text-sm font-medium text-gray-900">Enable automatic reminders</span>
                </label>
              </div>
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <i className="ri-information-line text-xl text-teal-600 mt-0.5"></i>
              <div>
                <h3 className="text-sm font-semibold text-teal-900 mb-1">How Review Cycles Work</h3>
                <ul className="text-sm text-teal-800 space-y-1">
                  <li>• Reviews expected every {localSettings.reviewCycle.cycleDurationWeeks} weeks from last completed review</li>
                  <li>• "Due soon" alerts appear {localSettings.reviewCycle.reminderWindowWeeks} weeks after last review</li>
                  <li>• Reviews become "Overdue" after {localSettings.reviewCycle.cycleDurationWeeks} weeks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Email Notification Settings</h2>
          <div className="space-y-3">
            {[
              { key: 'dueSoonEnabled', label: 'Review Due Soon', desc: 'Notify all parties when a review enters the reminder window' },
              { key: 'overdueEnabled', label: 'Review Overdue', desc: 'Send urgent notifications when reviews become overdue' },
              { key: 'signOffReminderEnabled', label: 'Sign-off Reminder', desc: 'Remind parties to sign off completed reviews' },
              { key: 'actionDueEnabled', label: 'Action Due Reminder', desc: 'Notify action owners when SMART actions are due soon' },
            ].map(item => (
              <label key={item.key} className="flex items-start cursor-pointer p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <input type="checkbox" checked={(localSettings.emailNotifications as any)[item.key]} onChange={e => update({ emailNotifications: { ...localSettings.emailNotifications, [item.key]: e.target.checked } })} className="w-4 h-4 text-teal-600 border-gray-300 rounded mt-1" />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'checklist' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">QA Checklist Configuration</h2>
          <div className="space-y-3">
            {localSettings.qaChecklist.criteria.sort((a, b) => a.order - b.order).map((criterion, i) => (
              <div key={criterion.code} className={`border rounded-lg p-4 transition-colors ${criterion.enabled ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-500 w-5">{i + 1}</span>
                    <input type="checkbox" checked={criterion.enabled} onChange={e => {
                      const updated = { ...localSettings.qaChecklist };
                      const idx = updated.criteria.findIndex(c => c.code === criterion.code);
                      updated.criteria[idx].enabled = e.target.checked;
                      update({ qaChecklist: updated });
                    }} className="w-4 h-4 text-teal-600 border-gray-300 rounded" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-semibold mb-0.5 ${criterion.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{criterion.title}</h3>
                    <p className={`text-xs ${criterion.enabled ? 'text-gray-500' : 'text-gray-400'}`}>{criterion.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <i className="ri-alert-line"></i> You have unsaved changes
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { if (settings) { setLocalSettings(JSON.parse(JSON.stringify(settings))); setHasChanges(false); } }} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg whitespace-nowrap cursor-pointer">Cancel</button>
              <button onClick={() => localSettings && updateMutation.mutate(localSettings)} disabled={updateMutation.isPending} className="px-6 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 whitespace-nowrap cursor-pointer disabled:opacity-50 flex items-center gap-2">
                {updateMutation.isPending ? <><LoadingSpinner size="sm" /> Saving...</> : <><i className="ri-save-line"></i> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasChanges && (
        <div className="flex justify-end mt-6">
          <button onClick={() => { if (window.confirm('Reset all settings to defaults?')) resetMutation.mutate(); }} disabled={resetMutation.isPending} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg whitespace-nowrap cursor-pointer disabled:opacity-50 flex items-center gap-2">
            <i className="ri-restart-line"></i> Reset to Defaults
          </button>
        </div>
      )}

      <div className="text-xs text-gray-400 text-center mt-8">
        Last updated: {new Date(localSettings.updatedAt).toLocaleString('en-GB')} by {localSettings.updatedBy}
      </div>
    </div>
  );
}
