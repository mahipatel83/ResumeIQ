from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard_view, name='admin_dashboard'),
    
    # User Management
    path('users/', views.users_view, name='admin_users'),
    path('users/add/', views.add_user_view, name='admin_add_user'),
    path('users/edit/<str:user_id>/', views.edit_user_view, name='admin_edit_user'),
    path('users/delete/<str:user_id>/', views.delete_user_view, name='admin_delete_user'),
    
    # Job Management
    path('jobs/', views.jobs_view, name='admin_jobs'),
    path('jobs/add/', views.add_job_view, name='admin_add_job'),
    path('jobs/edit/<str:job_id>/', views.edit_job_view, name='admin_edit_job'),
    path('jobs/delete/<str:job_id>/', views.delete_job_view, name='admin_delete_job'),
    
    # Job Drafts
    path('drafts/', views.drafts_view, name='admin_drafts'),
    path('drafts/delete/<str:draft_id>/', views.delete_draft_view, name='admin_delete_draft'),
    
    # Database Explorer
    path('explorer/', views.db_explorer_view, name='admin_db_explorer'),
    path('explorer/mongodb/<str:collection_name>/delete/<str:doc_id>/', views.delete_mongo_document, name='admin_delete_mongo_doc'),
]
