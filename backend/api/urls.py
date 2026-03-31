
from django.urls import path
from .views import (
    dashboard_due_soon,
    dashboard_kpis,
    dashboard_overdue,
    dashboard_recent_reviews,
    dashboard_status_counts,
    dashboard_weekly_trend,
    health_check,
    progress_reviews_otj_snapshot,
    progress_reviews_overview,
    progress_reviews_session_report,
)

urlpatterns = [
    path("health", health_check, name="health_check"),
    path("dashboard/kpis", dashboard_kpis, name="dashboard_kpis"),
    path("dashboard/due-soon", dashboard_due_soon, name="dashboard_due_soon"),
    path("dashboard/overdue", dashboard_overdue, name="dashboard_overdue"),
    path("dashboard/recent-reviews", dashboard_recent_reviews, name="dashboard_recent_reviews"),
    path("dashboard/status-counts", dashboard_status_counts, name="dashboard_status_counts"),
    path("dashboard/weekly-trend", dashboard_weekly_trend, name="dashboard_weekly_trend"),
    path("progress-reviews/overview", progress_reviews_overview, name="progress_reviews_overview"),
    path("progress-reviews/otj-snapshot", progress_reviews_otj_snapshot, name="progress_reviews_otj_snapshot"),
    path("progress-reviews/session-report", progress_reviews_session_report, name="progress_reviews_session_report"),
]
