import json

from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from resumeIQ.mongodb import users

# The signup/login pages are now React components in the separate
# `resumeiq-frontend` app (sibling folder to this Django project) — see:
#   resumeiq-frontend/src/components/Login.jsx
#   resumeiq-frontend/src/components/Signup.jsx
# instead of the old accounts/*.html Django templates.
# A plain GET to these URLs (e.g. someone opening the link directly) just
# bounces to the matching React route. The React pages submit via axios as
# POST + JSON, which is handled below and answered with JSON instead of a
# rendered template.
REACT_APP_BASE_URL = "https://resume-iq-steel.vercel.app"

# Where each role should land after logging in. These are still
# server-rendered Django views (not yet converted to React), so the
# response sends back a full absolute URL and the frontend does a normal
# browser redirect (not a client-side route change) so the session cookie
# is presented like any other top-level navigation.
ROLE_DASHBOARD_URL_NAME = {
    "admin": "admin_dashboard",
    "recruiter": "recruiter_dashboard",
    "customer": "candidate_dashboard",
}


def _get_payload(request):
    """Read POST data whether the client sent JSON (axios) or a classic form."""
    if request.content_type == "application/json":
        try:
            return json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return {}
    return request.POST


@csrf_exempt
def signup(request):
    if request.method == "POST":
        data = _get_payload(request)
        fullname = (data.get("fullname") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""
        role = data.get("role") or ""

        # Basic validation
        if not fullname or not email or not password or not role:
            return JsonResponse({
                "error": "All fields are required.",
                "values": {"fullname": fullname, "email": email, "role": role},
            }, status=400)

        # Prevent admin role registration via signup
        if role == "admin":
            return JsonResponse({
                "error": "Invalid role selected.",
                "values": {"fullname": fullname, "email": email, "role": ""},
            }, status=400)

        # Check if email already exists in MongoDB
        existing_user = users.find_one({"email": email})
        if existing_user:
            return JsonResponse({
                "error": "Email address already registered.",
                "values": {"fullname": fullname, "email": email, "role": role},
            }, status=400)

        # Store in MongoDB
        users.insert_one({
            "fullname": fullname,
            "email": email,
            "password": password,
            "role": role,
        })

        return JsonResponse({"success": True, "redirect_url": "/login"})

    if request.method == "GET":
        return redirect(REACT_APP_BASE_URL + "/signup")

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def login(request):
    if request.method == "POST":
        data = _get_payload(request)
        identifier = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()

        if not identifier or not password:
            return JsonResponse({
                "error": "Please enter your email/username and password.",
                "email": identifier,
            }, status=400)

        # Match by email OR fullname (username), case-insensitive for fullname
        user = users.find_one({
            "$or": [
                {"email": identifier, "password": password},
                {"fullname": {"$regex": f"^{identifier}$", "$options": "i"}, "password": password},
            ]
        })

        if user:
            request.session["user_email"] = user.get("email")
            role = user.get("role")
            url_name = ROLE_DASHBOARD_URL_NAME.get(role, "candidate_dashboard")
            redirect_url = request.build_absolute_uri(reverse(url_name))
            return JsonResponse({"success": True, "redirect_url": redirect_url})

        return JsonResponse({
            "error": "Invalid email/username or password.",
            "email": identifier,
        }, status=400)

    if request.method == "GET":
        return redirect(REACT_APP_BASE_URL + "/login")

    return JsonResponse({"error": "Method not allowed."}, status=405)


@csrf_exempt
def logout_view(request):
    request.session.flush()

    if request.method == "POST":
        return JsonResponse({"success": True, "redirect_url": "/login"})

    return redirect(REACT_APP_BASE_URL + "/login")
