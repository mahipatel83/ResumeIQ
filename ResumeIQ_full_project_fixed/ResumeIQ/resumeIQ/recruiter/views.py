from django.shortcuts import render, redirect
from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.urls import reverse
from django.core.mail import send_mail, get_connection
from django.conf import settings as django_settings
from datetime import datetime
import os
import re
import logging
from resumeIQ.mongodb import jobs, users, job_drafts, applications, notifications
from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
REACT_APP_BASE_URL = "http://localhost:5173"


def _format_salary(salary_min, salary_max, salary_hidden):
    """Build a human-readable salary string from the recruiter's inputs."""
    if salary_hidden:
        return "Competitive"
    try:
        smin = float(salary_min) if salary_min not in (None, "") else None
        smax = float(salary_max) if salary_max not in (None, "") else None
    except (TypeError, ValueError):
        smin = smax = None

    def _fmt(v):
        return str(int(v)) if v == int(v) else str(v)

    if smin is not None and smax is not None:
        return f"₹{_fmt(smin)}L – ₹{_fmt(smax)}L"
    if smin is not None:
        return f"₹{_fmt(smin)}L+"
    if smax is not None:
        return f"Up to ₹{_fmt(smax)}L"
    return "Not specified"


# ─── FRONTEND REDIRECTS ───

def dashboard(request):
    """Redirects recruiter to the React dashboard."""
    return redirect(REACT_APP_BASE_URL + "/recruiter/dashboard")


def create_job_view(request):
    """Redirects recruiter to the React create job page."""
    return redirect(REACT_APP_BASE_URL + "/recruiter/job/create")


def edit_job_view(request, job_id):
    """Redirects recruiter to the React edit job page."""
    return redirect(REACT_APP_BASE_URL + f"/recruiter/job/edit/{job_id}")


def settings_view(request):
    """Redirects recruiter to the React settings page."""
    return redirect(REACT_APP_BASE_URL + "/recruiter/settings")


# ─── JSON API ENDPOINTS ───

def recruiter_dashboard_api(request):
    """JSON API providing details for the Recruiter Dashboard."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    jobs_list = list(jobs.find({"recruiter_email": recruiter_email}).sort("_id", -1))
    
    EMPLOYMENT_CHOICES = {
        'full_time': 'Full-time',
        'part_time': 'Part-time',
        'contract': 'Contract',
    }
    
    total_views = 0
    for job in jobs_list:
        job['id_str'] = str(job['_id'])
        del job['_id']
        job['get_employment_type_display'] = EMPLOYMENT_CHOICES.get(
            job.get('employment_type'), job.get('employment_type')
        )
        total_views += job.get('views', 0)

    applications_list = list(applications.find({
        "recruiter_email": recruiter_email, 
        "dismissed_by_recruiter": {"$ne": True}
    }).sort("_id", -1))
    
    for app in applications_list:
        app['id_str'] = str(app['_id'])
        del app['_id']

    notifications_list = list(
        notifications.find({"recruiter_email": recruiter_email, "read": False}).sort("_id", -1).limit(20)
    )
    for n in notifications_list:
        n['id_str'] = str(n['_id'])
        del n['_id']
        
    unread_count = notifications.count_documents({"recruiter_email": recruiter_email, "read": False})

    user_profile = users.find_one({"email": recruiter_email})
    latest_company = user_profile.get("company_name") if user_profile else None
    if not latest_company:
        latest_company = "TechNova Solutions"
    saved_sender_email = ((user_profile or {}).get("email_settings") or {}).get("sender_email", "")

    return JsonResponse({
        "jobs": jobs_list,
        "latest_company": latest_company,
        "applications": applications_list,
        "total_applications": len(applications_list),
        "total_views": total_views,
        "notifications": notifications_list,
        "unread_count": unread_count,
        "saved_sender_email": saved_sender_email,
    })


@csrf_exempt
def mark_notifications_read(request):
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    notifications.update_many(
        {"recruiter_email": recruiter_email, "read": False},
        {"$set": {"read": True}}
    )
    return JsonResponse({"success": True})


def serve_resume_pdf(request, filename):
    """Streams a candidate's resume PDF directly."""
    if not request.session.get("user_email"):
        return JsonResponse({"error": "Not logged in"}, status=401)

    from django.conf import settings
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(settings.MEDIA_ROOT, "resumes", safe_filename)

    if not os.path.isfile(file_path):
        raise Http404("Resume not found")

    return FileResponse(open(file_path, "rb"), content_type="application/pdf")


def application_detail(request, application_id):
    """Returns candidate's resume + short summary."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    try:
        try:
            app = applications.find_one({"_id": ObjectId(application_id), "recruiter_email": recruiter_email})
        except Exception:
            app = None
        if not app:
            return JsonResponse({"error": "Application not found"}, status=404)

        candidate = users.find_one({"email": app.get("candidate_email")}) or {}
        ats_analysis = candidate.get("ats_analysis") or {}
        resume_summary = ats_analysis.get("resume_summary") or {}

        raw_skills = resume_summary.get("key_skills") or []
        if isinstance(raw_skills, str):
            key_skills_list = [s.strip() for s in raw_skills.split(",") if s.strip() and s.strip().lower() != "none matched"]
        elif isinstance(raw_skills, (list, tuple)):
            key_skills_list = [str(s).strip() for s in raw_skills if str(s).strip()]
        else:
            key_skills_list = []

        strengths = ats_analysis.get("strengths") or []
        if not isinstance(strengths, (list, tuple)):
            strengths = [str(strengths)]

        resume_pdf_url = app.get("resume_pdf_url") or candidate.get("resume_pdf_url") or None
        resume_text = app.get("resume_text") or candidate.get("resume_text", "")

        if resume_pdf_url:
            from django.conf import settings
            filename = os.path.basename(resume_pdf_url.split(settings.MEDIA_URL, 1)[-1])
            disk_path = os.path.join(settings.MEDIA_ROOT, "resumes", filename)
            if not os.path.isfile(disk_path):
                resume_pdf_url = None
            else:
                resume_pdf_url = request.build_absolute_uri(reverse('serve_resume_pdf', args=[filename]))

        return JsonResponse({
            "success": True,
            "candidate_name": app.get("candidate_name", "Candidate"),
            "candidate_email": app.get("candidate_email", ""),
            "job_title": app.get("job_title", ""),
            "company_name": app.get("company_name", ""),
            "applied_on": app.get("applied_on", ""),
            "status": app.get("status", "Under Review"),
            "ats_score": app.get("ats_score", 0),
            "resume_summary": {
                "phone": resume_summary.get("phone") or "Not found",
                "email": resume_summary.get("email") or app.get("candidate_email", ""),
                "experience": resume_summary.get("experience") or "Not specified",
                "key_skills": key_skills_list,
            },
            "strengths": strengths,
            "resume_text": resume_text,
            "resume_pdf_url": resume_pdf_url,
        })
    except Exception as e:
        logger.exception("application_detail failed for application_id=%s", application_id)
        return JsonResponse({"error": f"Could not load application details: {str(e)}"}, status=500)


@csrf_exempt
def send_candidate_email(request, application_id):
    """Sends email message to candidate."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        app = applications.find_one({"_id": ObjectId(application_id), "recruiter_email": recruiter_email})
    except Exception:
        app = None
    if not app:
        return JsonResponse({"error": "Application not found"}, status=404)

    candidate_email = (app.get("candidate_email") or "").strip()
    if not candidate_email or not EMAIL_RE.match(candidate_email):
        return JsonResponse({"error": "This candidate doesn't have a valid email on file"}, status=400)

    message = request.POST.get("message", "").strip()
    if not message:
        return JsonResponse({"error": "Message cannot be empty"}, status=400)

    default_subject = f"Regarding your application for {app.get('job_title', 'the position')}"
    subject = request.POST.get("subject", "").strip() or default_subject

    recruiter = users.find_one({"email": recruiter_email}) or {}
    company_name = app.get("company_name") or recruiter.get("company_name") or "the hiring team"
    signed_message = f"{message}\n\n— {recruiter.get('name', recruiter_email)}, {company_name}"

    stored_email_settings = recruiter.get("email_settings") or {}
    posted_sender_email = request.POST.get("sender_email", "").strip()
    posted_app_password = request.POST.get("app_password", "").strip()

    sender_email = posted_sender_email or stored_email_settings.get("sender_email", "")
    app_password = posted_app_password or stored_email_settings.get("app_password", "")

    if not sender_email or not EMAIL_RE.match(sender_email):
        return JsonResponse({"error": "Enter the Gmail address you want to send from"}, status=400)
    if not app_password:
        return JsonResponse({"error": "Enter your Gmail App Password"}, status=400)

    connection = None
    try:
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host="smtp.gmail.com",
            port=587,
            username=sender_email,
            password=app_password,
            use_tls=True,
        )
    except Exception:
        logger.exception("Failed to build recruiter SMTP connection for %s", recruiter_email)
        return JsonResponse({"error": "Could not connect to Gmail with those details."}, status=500)

    try:
        send_mail(
            subject=subject,
            message=signed_message,
            from_email=sender_email,
            recipient_list=[candidate_email],
            fail_silently=False,
            connection=connection,
        )
    except Exception:
        logger.exception("Failed to email candidate %s for application_id=%s", candidate_email, application_id)
        return JsonResponse({"error": "Could not send the email. Double check your Gmail address and App Password."}, status=500)

    try:
        users.update_one(
            {"email": recruiter_email},
            {"$set": {
                "email_settings.smtp_host": "smtp.gmail.com",
                "email_settings.smtp_port": 587,
                "email_settings.sender_email": sender_email,
                "email_settings.app_password": app_password,
                "email_settings.use_tls": True,
            }},
            upsert=True,
        )
    except Exception:
        logger.exception("Failed to persist email_settings for %s", recruiter_email)

    try:
        notifications.insert_one({
            "candidate_email": candidate_email,
            "recruiter_email": recruiter_email,
            "message": f"You have a new message from {company_name} regarding {app.get('job_title', 'your application')}.",
            "type": "recruiter_message",
            "read": False,
            "created_at": datetime.now(),
        })
    except Exception:
        logger.exception("Failed to record recruiter_message notification for application_id=%s", application_id)

    return JsonResponse({"success": True})


@csrf_exempt
def update_application_status(request, application_id):
    """Updates candidate application status."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    new_status = request.POST.get("status", "").strip()
    if new_status not in ("Hired", "Rejected", "Under Review"):
        return JsonResponse({"error": "Invalid status"}, status=400)

    try:
        try:
            app = applications.find_one({"_id": ObjectId(application_id), "recruiter_email": recruiter_email})
        except Exception:
            app = None
        if not app:
            return JsonResponse({"error": "Application not found"}, status=404)

        applications.update_one({"_id": app["_id"]}, {"$set": {"status": new_status}})

        if new_status == "Hired":
            notifications.insert_one({
                "candidate_email": app.get("candidate_email"),
                "recruiter_email": recruiter_email,
                "message": f"🎉 Congratulations! You've been hired for {app.get('job_title')} at {app.get('company_name')}.",
                "type": "hired",
                "read": False,
                "created_at": datetime.now(),
            })
        elif new_status == "Rejected":
            notifications.insert_one({
                "candidate_email": app.get("candidate_email"),
                "recruiter_email": recruiter_email,
                "message": f"Your application for {app.get('job_title')} at {app.get('company_name')} was not selected this time.",
                "type": "rejected",
                "read": False,
                "created_at": datetime.now(),
            })

        return JsonResponse({"success": True, "status": new_status})
    except Exception as e:
        logger.exception("update_application_status failed for application_id=%s", application_id)
        return JsonResponse({"error": f"Could not update status: {str(e)}"}, status=500)


@csrf_exempt
def create_job_api(request):
    """API for creating job or restoring draft."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    user_profile = users.find_one({"email": recruiter_email})
    locked_company_name = user_profile.get("company_name") if user_profile else None

    if request.method == "POST":
        form_action = request.POST.get("form_action", "publish")

        if locked_company_name:
            company_name = locked_company_name
        else:
            company_name = request.POST.get("company_name")
            if company_name:
                users.update_one({"email": recruiter_email}, {"$set": {"company_name": company_name}})
                locked_company_name = company_name

        job_title = request.POST.get("job_title")
        job_icon = request.POST.get("job_icon")
        employment_type = request.POST.get("employment_type")
        experience_level = request.POST.get("experience_level")
        exp_min = request.POST.get("exp_min")
        exp_max = request.POST.get("exp_max")
        location = request.POST.get("location")
        is_remote = request.POST.get("is_remote") == "on"
        salary_min = request.POST.get("salary_min", "").strip()
        salary_max = request.POST.get("salary_max", "").strip()
        salary_hidden = request.POST.get("salary_hidden") == "on"
        required_skills = request.POST.get("required_skills", "").strip()
        job_description = request.POST.get("job_description", "").strip()

        if form_action == "draft":
            job_drafts.update_one(
                {"recruiter_email": recruiter_email},
                {"$set": {
                    "recruiter_email": recruiter_email,
                    "company_name": company_name,
                    "job_title": job_title,
                    "job_icon": job_icon,
                    "employment_type": employment_type,
                    "experience_level": experience_level,
                    "exp_min": exp_min,
                    "exp_max": exp_max,
                    "location": location,
                    "is_remote": is_remote,
                    "salary_min": salary_min,
                    "salary_max": salary_max,
                    "salary_hidden": salary_hidden,
                    "required_skills": required_skills,
                    "job_description": job_description,
                }},
                upsert=True
            )
            return JsonResponse({"success": True, "action": "draft"})

        jobs.insert_one({
            "recruiter_email": recruiter_email,
            "company_name": company_name,
            "job_title": job_title,
            "job_icon": job_icon,
            "employment_type": employment_type,
            "experience_level": experience_level,
            "experience_range": f"{exp_min}-{exp_max} Years",
            "location": location,
            "is_remote": is_remote,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_hidden": salary_hidden,
            "salary_display": _format_salary(salary_min, salary_max, salary_hidden),
            "required_skills": required_skills,
            "job_description": job_description,
        })
        job_drafts.delete_one({"recruiter_email": recruiter_email})
        return JsonResponse({"success": True, "action": "publish"})

    # GET request
    draft = job_drafts.find_one({"recruiter_email": recruiter_email})
    if draft:
        draft['id_str'] = str(draft['_id'])
        del draft['_id']
    return JsonResponse({
        "locked_company_name": locked_company_name,
        "has_draft": draft is not None,
        "job": draft
    })


@csrf_exempt
def delete_job_view_api(request, job_id):
    """API for deleting a job posting."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    try:
        jobs.delete_one({"_id": ObjectId(job_id), "recruiter_email": recruiter_email})
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@csrf_exempt
def edit_job_api(request, job_id):
    """API for editing details of a job posting."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    try:
        job = jobs.find_one({"_id": ObjectId(job_id), "recruiter_email": recruiter_email})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    if not job:
        return JsonResponse({"error": "Job not found"}, status=404)

    user_profile = users.find_one({"email": recruiter_email})
    locked_company_name = user_profile.get("company_name") if user_profile else None

    if request.method == "POST":
        if locked_company_name:
            company_name = locked_company_name
        else:
            company_name = request.POST.get("company_name")
            if company_name:
                users.update_one({"email": recruiter_email}, {"$set": {"company_name": company_name}})
                locked_company_name = company_name

        job_title = request.POST.get("job_title")
        job_icon = request.POST.get("job_icon")
        employment_type = request.POST.get("employment_type")
        experience_level = request.POST.get("experience_level")
        exp_min = request.POST.get("exp_min")
        exp_max = request.POST.get("exp_max")
        location = request.POST.get("location")
        is_remote = request.POST.get("is_remote") == "on"
        salary_min = request.POST.get("salary_min", "").strip()
        salary_max = request.POST.get("salary_max", "").strip()
        salary_hidden = request.POST.get("salary_hidden") == "on"
        required_skills = request.POST.get("required_skills", "").strip()
        job_description = request.POST.get("job_description", "").strip()

        jobs.update_one(
            {"_id": ObjectId(job_id), "recruiter_email": recruiter_email},
            {"$set": {
                "company_name": company_name,
                "job_title": job_title,
                "job_icon": job_icon,
                "employment_type": employment_type,
                "experience_level": experience_level,
                "experience_range": f"{exp_min}-{exp_max} Years",
                "location": location,
                "is_remote": is_remote,
                "salary_min": salary_min,
                "salary_max": salary_max,
                "salary_hidden": salary_hidden,
                "salary_display": _format_salary(salary_min, salary_max, salary_hidden),
                "required_skills": required_skills,
                "job_description": job_description,
            }}
        )
        return JsonResponse({"success": True})

    # GET request
    exp_min_val = ""
    exp_max_val = ""
    exp_range = job.get("experience_range", "")
    if "-" in exp_range:
        try:
            parts = exp_range.split(" ")[0].split("-")
            exp_min_val = parts[0]
            exp_max_val = parts[1]
        except Exception:
            pass

    job['id_str'] = str(job['_id'])
    del job['_id']

    return JsonResponse({
        "success": True,
        "job": job,
        "exp_min": exp_min_val,
        "exp_max": exp_max_val,
        "locked_company_name": locked_company_name,
    })


def settings_api(request):
    """API for settings configurations retrieval."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    user_profile = users.find_one({"email": recruiter_email})
    latest_company = user_profile.get("company_name") if user_profile else None
    if not latest_company:
        latest_company = "TechNova Solutions"
    email_settings = (user_profile or {}).get("email_settings") or {}
    # App password shouldn't be fully returned for security
    if "app_password" in email_settings:
        # We can just keep a dummy password flag to let React know a password is set
        email_settings["has_app_password"] = True
        del email_settings["app_password"]

    jobs_list = list(jobs.find({"recruiter_email": recruiter_email}))
    
    EMPLOYMENT_CHOICES = {
        'full_time': 'Full-time',
        'part_time': 'Part-time',
        'contract': 'Contract',
    }
    
    for job in jobs_list:
        job['id_str'] = str(job['_id'])
        del job['_id']
        job['get_employment_type_display'] = EMPLOYMENT_CHOICES.get(
            job.get('employment_type'), job.get('employment_type')
        )

    return JsonResponse({
        "jobs": jobs_list,
        "latest_company": latest_company,
        "email_settings": email_settings,
    })


@csrf_exempt
def settings_profile_api(request):
    """API for company name profile updates."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    if request.method == "POST":
        new_company_name = request.POST.get("company_name")
        if new_company_name:
            users.update_one({"email": recruiter_email}, {"$set": {"company_name": new_company_name}})
            jobs.update_many({"recruiter_email": recruiter_email}, {"$set": {"company_name": new_company_name}})
            return JsonResponse({"success": True})
        return JsonResponse({"success": False, "error": "Company name is required"}, status=400)


@csrf_exempt
def settings_email_api(request):
    """API for recruiter SMTP credentials settings."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)

    if request.method == "POST":
        sender_email = request.POST.get("sender_email", "").strip()
        app_password = request.POST.get("app_password", "").strip()

        user_profile = users.find_one({"email": recruiter_email})
        email_settings = (user_profile or {}).get("email_settings") or {}

        if not sender_email:
            return JsonResponse({"success": False, "error": "Gmail address is required."}, status=400)
        if not app_password and not email_settings.get("app_password"):
            return JsonResponse({"success": False, "error": "App Password is required."}, status=400)

        update_fields = {
            "email_settings.smtp_host": "smtp.gmail.com",
            "email_settings.smtp_port": 587,
            "email_settings.sender_email": sender_email,
            "email_settings.use_tls": True,
        }
        if app_password:
            update_fields["email_settings.app_password"] = app_password

        users.update_one({"email": recruiter_email}, {"$set": update_fields}, upsert=True)
        return JsonResponse({"success": True})


@csrf_exempt
def dismiss_application(request):
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    app_id = request.POST.get("app_id")
    if not app_id:
        return JsonResponse({"error": "Missing application ID"}, status=400)
        
    try:
        applications.update_one(
            {"_id": ObjectId(app_id), "recruiter_email": recruiter_email},
            {"$set": {"dismissed_by_recruiter": True}}
        )
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def generate_description_api(request):
    """Generates a professional job description using Langchain."""
    recruiter_email = request.session.get("user_email")
    if not recruiter_email:
        return JsonResponse({"error": "Not logged in"}, status=401)
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    job_title = request.POST.get("job_title", "").strip()
    required_skills = request.POST.get("required_skills", "").strip()
    
    if not job_title:
        try:
            import json
            body = json.loads(request.body)
            job_title = body.get("job_title", "").strip()
            required_skills = body.get("required_skills", "").strip()
        except Exception:
            pass
            
    if not job_title:
        return JsonResponse({"error": "Job title is required"}, status=400)
        
    from .description_generator import generate_job_description
    description = generate_job_description(job_title, required_skills)
    return JsonResponse({"success": True, "description": description})
