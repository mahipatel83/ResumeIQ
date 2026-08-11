from django.urls import path
from . import views

urlpatterns = [
    # Frontend Redirects
    path("dashboard/", views.dashboard, name="recruiter_dashboard"),
    path('job/create/', views.create_job_view, name='create_job'),
    path('job/edit/<str:job_id>/', views.edit_job_view, name='edit_job'),
    path('settings/', views.settings_view, name='recruiter_settings'),

    # JSON API Endpoints
    path('api/dashboard/', views.recruiter_dashboard_api, name='recruiter_dashboard_api'),
    path('api/settings/', views.settings_api, name='settings_api'),
    path('api/settings/profile/', views.settings_profile_api, name='settings_profile_api'),
    path('api/settings/email/', views.settings_email_api, name='settings_email_api'),
    path('api/job/create/', views.create_job_api, name='create_job_api'),
    path('api/job/details/<str:job_id>/', views.edit_job_api, name='job_details_api'),
    path('api/job/edit/<str:job_id>/', views.edit_job_api, name='edit_job_api'),
    path('api/job/delete/<str:job_id>/', views.delete_job_view_api, name='delete_job_api'),
    path('api/job/generate-description/', views.generate_description_api, name='generate_description_api'),
    
    # Existing application details/actions
    path('notifications/mark-read/', views.mark_notifications_read, name='mark_notifications_read'),
    path('application/<str:application_id>/details/', views.application_detail, name='application_detail'),
    path('application/<str:application_id>/email/', views.send_candidate_email, name='send_candidate_email'),
    path('application/<str:application_id>/status/', views.update_application_status, name='update_application_status'),
    path('application/dismiss/', views.dismiss_application, name='dismiss_application'),
    path('resume/<str:filename>/', views.serve_resume_pdf, name='serve_resume_pdf'),
]
