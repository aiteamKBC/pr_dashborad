import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { dashboardApi } from '../api/dashboard-api';
import KPICard from '../components/KPICard';
import DueSoonPanel from '../components/DueSoonPanel';
import OverduePanel from '../components/OverduePanel';
import RecentReviewsTable from '../components/RecentReviewsTable';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import Button from '../../../shared/components/Button';

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: () => dashboardApi.getDashboardKPIs(),
  });

  const { data: dueSoonLearners, isLoading: dueSoonLoading } = useQuery({
    queryKey: ['due-soon-learners'],
    queryFn: () => dashboardApi.getDueSoonLearners(),
  });

  const { data: overdueLearners, isLoading: overdueLoading } = useQuery({
    queryKey: ['overdue-learners'],
    queryFn: () => dashboardApi.getOverdueLearners(),
  });

  const { data: recentReviews, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-reviews'],
    queryFn: () => dashboardApi.getRecentCompletedReviews(),
  });

  const { data: statusCounts, isLoading: statusLoading } = useQuery({
    queryKey: ['status-counts'],
    queryFn: () => dashboardApi.getStatusCounts(),
  });

  const { data: weeklyTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['weekly-trend'],
    queryFn: () => dashboardApi.getWeeklyTrend(),
  });

  const statusChartData = statusCounts ? [
    { name: 'Not Started', count: statusCounts.notStarted, fill: '#6b7280' },
    { name: 'Due Soon', count: statusCounts.dueSoon, fill: '#f59e0b' },
    { name: 'Overdue', count: statusCounts.overdue, fill: '#ef4444' },
    { name: 'Completed', count: statusCounts.completed, fill: '#22c55e' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monitor review cycles and track learner progress</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tripartite-reviews/learners">
              <Button variant="secondary" size="sm">
                <i className="ri-user-line"></i>
                All Learners
              </Button>
            </Link>
            <Link to="/tripartite-reviews/notifications">
              <Button variant="secondary" size="sm">
                <i className="ri-notification-line"></i>
                Notifications
              </Button>
            </Link>
          </div>
        </div>

        {kpisLoading ? (
          <LoadingSpinner />
        ) : kpis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <KPICard
              title="Total Learners in Scope"
              value={kpis.totalLearnersInScope}
              icon="ri-user-3-line"
              color="text-teal-600"
              iconBg="bg-teal-50"
            />
            <KPICard
              title="Reviews Due Soon"
              value={kpis.reviewsDueSoon}
              icon="ri-time-line"
              color="text-amber-600"
              iconBg="bg-amber-50"
            />
            <KPICard
              title="Overdue Reviews"
              value={kpis.overdueReviews}
              icon="ri-alert-line"
              color="text-red-600"
              iconBg="bg-red-50"
            />
            <KPICard
              title="Completed This Month"
              value={kpis.completedThisMonth}
              icon="ri-checkbox-circle-line"
              color="text-green-600"
              iconBg="bg-green-50"
            />
            <KPICard
              title="Compliance Rate"
              value={`${kpis.complianceRate}%`}
              icon="ri-shield-check-line"
              color="text-indigo-600"
              iconBg="bg-indigo-50"
            />
          </div>
        ) : null}

        <div className="mb-8">
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
          {dueSoonLoading ? (
            <LoadingSpinner />
          ) : dueSoonLearners ? (
            <DueSoonPanel learners={dueSoonLearners} />
          ) : null}
        </div>

        <div className="mb-8">
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
          {overdueLoading ? (
            <LoadingSpinner />
          ) : overdueLearners ? (
            <OverduePanel learners={overdueLearners} />
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-5">Learners by Status</h3>
            {statusLoading ? (
              <LoadingSpinner />
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusChartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    cursor={{ fill: '#f9fafb' }}
                  />
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
            {trendLoading ? (
              <LoadingSpinner />
            ) : weeklyTrend && weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="weekLabel" 
                    tick={{ fontSize: 11, fill: '#6b7280' }} 
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }} 
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="completedCount" 
                    stroke="#14b8a6" 
                    strokeWidth={2}
                    name="Completed Reviews"
                    dot={{ fill: '#14b8a6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 flex items-center justify-center bg-teal-50 rounded-lg">
                <i className="ri-file-list-3-line text-teal-600 text-sm"></i>
              </div>
              <h2 className="text-base font-semibold text-gray-900">Recent Completed Reviews</h2>
            </div>
            {recentReviews && recentReviews.length > 0 && (
              <Link to="/tripartite-reviews">
                <Button variant="secondary" size="sm">
                  View All Reviews
                  <i className="ri-arrow-right-line"></i>
                </Button>
              </Link>
            )}
          </div>
          {recentLoading ? (
            <LoadingSpinner />
          ) : recentReviews ? (
            <RecentReviewsTable reviews={recentReviews} />
          ) : null}
        </div>
      </div>
    </div>
  );
}