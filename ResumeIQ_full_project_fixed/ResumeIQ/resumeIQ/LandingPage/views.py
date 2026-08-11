from django.shortcuts import render, redirect
from django.http import HttpResponse
from resumeIQ.mongodb import db

# The landing page and all of its linked pages (AI Assistant, How it Works,
# Documentation) are now React components in the separate `resumeiq-frontend`
# app (sibling folder to this Django project) — see:
#   resumeiq-frontend/src/components/LandingPage.jsx
#   resumeiq-frontend/src/components/AiAssistant.jsx
#   resumeiq-frontend/src/components/HowItWorks.jsx
#   resumeiq-frontend/src/components/Documentation.jsx
# instead of the old LandingPage/*.html Django templates.
# Point this at wherever your React app is served, e.g.:
#   - Vite dev server during development: "http://localhost:5173" (Vite's default port)
#   - A built React app served by Django/another host in production
REACT_APP_BASE_URL = "http://localhost:5173"

def home(request):
    return redirect(REACT_APP_BASE_URL + "/")

def ai_assistant(request):
    return redirect(REACT_APP_BASE_URL + "/ai-assistant")

def how_it_works(request):
    return redirect(REACT_APP_BASE_URL + "/how-it-works")

def documentation(request):
    return redirect(REACT_APP_BASE_URL + "/documentation")

def dashboard_view(request):
    user_email = request.session.get("user_email")
    if not user_email:
        return redirect(REACT_APP_BASE_URL + "/login")
    return redirect(REACT_APP_BASE_URL + "/dashboard")

def resume_analysis_view(request):
    user_email = request.session.get("user_email")
    if not user_email:
        return redirect(REACT_APP_BASE_URL + "/login")
    return redirect(REACT_APP_BASE_URL + "/resume-analysis")

def job_recommendations_view(request):
    user_email = request.session.get("user_email")
    if not user_email:
        return redirect(REACT_APP_BASE_URL + "/login")
    return redirect(REACT_APP_BASE_URL + "/job-recommendations")


