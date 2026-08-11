from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path('ai-assistant/', views.ai_assistant, name='ai_assistant'),
    path('how-it-works/', views.how_it_works, name='how_it_works'),
    path('documentation/', views.documentation, name='documentation'),
    path('dashboard/', views.dashboard_view, name='dashboard_view'),
    path('resume-analysis/', views.resume_analysis_view, name='resume_analysis_view'),
    path('job-recommendations/', views.job_recommendations_view, name='job_recommendations_view'),
]