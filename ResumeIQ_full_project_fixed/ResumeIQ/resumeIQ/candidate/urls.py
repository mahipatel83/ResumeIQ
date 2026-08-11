from django.urls import path
from . import views

urlpatterns = [
    path("dashboard/", views.dashboard, name="candidate_dashboard"),
    path("api/dashboard/", views.candidate_dashboard_api, name="candidate_dashboard_api"),
    path("analyze-resume/", views.analyze_resume, name="analyze_resume"),
    path("apply-job/", views.apply_job, name="apply_job"),
    path("job-view/<str:job_id>/", views.track_job_view, name="track_job_view"),
]