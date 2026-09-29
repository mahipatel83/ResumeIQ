import json

from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from resumeIQ.mongodb import users


# React frontend deployed on Vercel
REACT_APP_BASE_URL = "https://resume-iq-steel.vercel.app"


# Dashboard URL names for each user role
ROLE_DASHBOARD_URL_NAME = {
    "admin": "admin_dashboard",
    "recruiter": "recruiter_dashboard",
    "customer": "candidate_dashboard",
}


def _get_payload(request):
    """
    Read data from JSON requests sent by React/Axios
    or normal Django form requests.
    """
    if request.content_type == "application/json":
        try:
            return json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return {}

    return request.POST


@csrf_exempt
def signup(request):

    # -------------------------
    # POST = React signup
    # -------------------------
    if request.method == "POST":

        data = _get_payload(request)

        fullname = (data.get("fullname") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""
        role = data.get("role") or ""

        # Check required fields
        if not fullname or not email or not password or not role:
            return JsonResponse(
                {
                    "error": "All fields are required.",
                    "values": {
                        "fullname": fullname,
                        "email": email,
                        "role": role,
                    },
                },
                status=400,
            )

        # Do not allow admin registration
        if role == "admin":
            return JsonResponse(
                {
                    "error": "Invalid role selected.",
                    "values": {
                        "fullname": fullname,
                        "email": email,
                        "role": "",
                    },
                },
                status=400,
            )

        # Check MongoDB for existing email
        existing_user = users.find_one({"email": email})

        if existing_user:
            return JsonResponse(
                {
                    "error": "Email address already registered.",
                    "values": {
                        "fullname": fullname,
                        "email": email,
                        "role": role,
                    },
                },
                status=400,
            )

        # Save user in MongoDB
        users.insert_one(
            {
                "fullname": fullname,
                "email": email,
                "password": password,
                "role": role,
            }
        )

        # Send user to React login page
        return JsonResponse(
            {
                "success": True,
                "redirect_url": REACT_APP_BASE_URL + "/login",
            }
        )

    # -------------------------
    # GET = open React signup
    # -------------------------
    if request.method == "GET":
        return redirect(REACT_APP_BASE_URL + "/signup")

    return JsonResponse(
        {"error": "Method not allowed."},
        status=405,
    )


@csrf_exempt
def login(request):

    # -------------------------
    # POST = React login
    # -------------------------
    if request.method == "POST":

        data = _get_payload(request)

        identifier = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()

        # Check empty fields
        if not identifier or not password:
            return JsonResponse(
                {
                    "error": "Please enter your email/username and password.",
                    "email": identifier,
                },
                status=400,
            )

        # Find user by email OR fullname
        user = users.find_one(
            {
                "$or": [
                    {
                        "email": identifier,
                        "password": password,
                    },
                    {
                        "fullname": {
                            "$regex": f"^{identifier}$",
                            "$options": "i",
                        },
                        "password": password,
                    },
                ]
            }
        )

        # -------------------------
        # Login successful
        # -------------------------
        if user:

            # Store login session
            request.session["user_email"] = user.get("email")
            request.session.save()

            role = user.get("role")

            url_name = ROLE_DASHBOARD_URL_NAME.get(
                role,
                "candidate_dashboard",
            )

            # Django dashboard URL
            redirect_url = request.build_absolute_uri(
                reverse(url_name)
            )

            return JsonResponse(
                {
                    "success": True,
                    "redirect_url": redirect_url,
                }
            )

        # -------------------------
        # Login failed
        # -------------------------
        return JsonResponse(
            {
                "error": "Invalid email/username or password.",
                "email": identifier,
            },
            status=400,
        )

    # -------------------------
    # GET = open React login
    # -------------------------
    if request.method == "GET":
        return redirect(REACT_APP_BASE_URL + "/login")

    return JsonResponse(
        {"error": "Method not allowed."},
        status=405,
    )


@csrf_exempt
def logout_view(request):

    # Remove current session
    request.session.flush()

    # React logout request
    if request.method == "POST":
        return JsonResponse(
            {
                "success": True,
                "redirect_url": REACT_APP_BASE_URL + "/login",
            }
        )

    # Direct browser visit
    return redirect(REACT_APP_BASE_URL + "/login")
