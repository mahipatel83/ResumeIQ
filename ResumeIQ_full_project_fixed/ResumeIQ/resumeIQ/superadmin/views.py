from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from resumeIQ.mongodb import users as mongo_users, jobs as mongo_jobs, job_drafts as mongo_drafts, db as mongo_db
from bson.objectid import ObjectId
import json

REACT_APP_BASE_URL = "http://localhost:5173"

def is_admin(request):
    email = request.session.get("user_email")
    if not email:
        return False
    user = mongo_users.find_one({"email": email})
    return user and user.get("role") == "admin"

def check_format_or_api(request):
    accept_header = request.headers.get("Accept", "")
    return (
        "application/json" in accept_header
        or request.content_type == "application/json"
        or request.GET.get("format") == "json"
        or request.method in ["POST", "PUT", "DELETE"]
    )

def _get_payload(request):
    if request.content_type == "application/json":
        try:
            return json.loads(request.body or "{}")
        except json.JSONDecodeError:
            return {}
    return request.POST

@csrf_exempt
def dashboard_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        return redirect(REACT_APP_BASE_URL + "/superadmin")

    # 1. Total Counts
    total_users = mongo_users.count_documents({})
    total_jobs = mongo_jobs.count_documents({})
    total_drafts = mongo_drafts.count_documents({})

    # Role breakdown
    candidates_count = mongo_users.count_documents({"role": "customer"})
    recruiters_count = mongo_users.count_documents({"role": "recruiter"})
    admins_count = mongo_users.count_documents({"role": "admin"})

    # Job type breakdown
    full_time_jobs = mongo_jobs.count_documents({"employment_type": "full_time"})
    part_time_jobs = mongo_jobs.count_documents({"employment_type": "part_time"})
    contract_jobs = mongo_jobs.count_documents({"employment_type": "contract"})

    # 2. Database Connection Health
    mongo_status = "Connected"
    mongo_err = None
    try:
        mongo_db.client.admin.command('ping')
    except Exception as e:
        mongo_status = "Disconnected"
        mongo_err = str(e)

    sqlite_status = "Connected"
    sqlite_err = None
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as e:
        sqlite_status = "Disconnected"
        sqlite_err = str(e)

    # 3. Recent Activities
    recent_users = list(mongo_users.find().sort("_id", -1).limit(5))
    recent_jobs = list(mongo_jobs.find().sort("_id", -1).limit(5))

    for u in recent_users:
        u['id_str'] = str(u['_id'])
        del u['_id']
    for j in recent_jobs:
        j['id_str'] = str(j['_id'])
        del j['_id']

    email = request.session.get("user_email")
    user = mongo_users.find_one({"email": email})
    user_name = user.get("fullname", "Admin") if user else "Admin"

    data = {
        "user_name": user_name,
        "total_users": total_users,
        "total_jobs": total_jobs,
        "total_drafts": total_drafts,
        "candidates_count": candidates_count,
        "recruiters_count": recruiters_count,
        "admins_count": admins_count,
        "full_time_jobs": full_time_jobs,
        "part_time_jobs": part_time_jobs,
        "contract_jobs": contract_jobs,
        "mongo_status": mongo_status,
        "mongo_err": mongo_err,
        "sqlite_status": sqlite_status,
        "sqlite_err": sqlite_err,
        "recent_users": recent_users,
        "recent_jobs": recent_jobs,
    }
    return JsonResponse(data)

@csrf_exempt
def users_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        q = request.GET.get("q", "").strip()
        return redirect(REACT_APP_BASE_URL + f"/superadmin?tab=users&q={q}")

    q = request.GET.get("q", "").strip()
    if q:
        query = {
            "$or": [
                {"fullname": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"role": {"$regex": q, "$options": "i"}}
            ]
        }
    else:
        query = {}

    users_list = list(mongo_users.find(query).sort("_id", -1))
    for u in users_list:
        u['id_str'] = str(u['_id'])
        del u['_id']

    return JsonResponse({"users": users_list, "q": q})

@csrf_exempt
def add_user_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        return redirect(REACT_APP_BASE_URL + "/superadmin?tab=users")

    if request.method == "POST":
        data = _get_payload(request)
        fullname = (data.get("fullname") or "").strip()
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()
        role = (data.get("role") or "").strip()
        company_name = (data.get("company_name") or "").strip()

        if not fullname or not email or not password or not role:
            return JsonResponse({"error": "All fields are required."}, status=400)

        # Check existing email
        if mongo_users.find_one({"email": email}):
            return JsonResponse({"error": "Email is already registered."}, status=400)

        user_doc = {
            "fullname": fullname,
            "email": email,
            "password": password,
            "role": role
        }
        if role == "recruiter" and company_name:
            user_doc["company_name"] = company_name

        mongo_users.insert_one(user_doc)
        return JsonResponse({"success": True, "message": "User added successfully!"})

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def edit_user_view(request, user_id):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    try:
        user = mongo_users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        return JsonResponse({"error": "Invalid User ID"}, status=400)

    if not user:
        return JsonResponse({"error": "User not found"}, status=404)

    user['id_str'] = str(user['_id'])
    del user['_id']

    if not check_format_or_api(request):
        return redirect(REACT_APP_BASE_URL + f"/superadmin?tab=users&action=edit&id={user_id}")

    if request.method in ["POST", "PUT"]:
        data = _get_payload(request)
        fullname = (data.get("fullname") or "").strip()
        email = (data.get("email") or "").strip()
        password = (data.get("password") or "").strip()
        role = (data.get("role") or "").strip()
        company_name = (data.get("company_name") or "").strip()

        if not fullname or not email or not role:
            return JsonResponse({"error": "Name, Email, and Role are required."}, status=400)

        # Update document
        update_doc = {
            "fullname": fullname,
            "email": email,
            "role": role
        }
        if password:
            update_doc["password"] = password
        if role == "recruiter":
            update_doc["company_name"] = company_name
        else:
            # Clear company name if role changed from recruiter
            update_doc["company_name"] = ""

        mongo_users.update_one({"_id": ObjectId(user_id)}, {"$set": update_doc})
        return JsonResponse({"success": True, "message": "User updated successfully!"})

    # Return single user data for GET API
    return JsonResponse({"user": user})

@csrf_exempt
def delete_user_view(request, user_id):
    if not is_admin(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method in ["POST", "DELETE"]:
        try:
            mongo_users.delete_one({"_id": ObjectId(user_id)})
            return JsonResponse({"success": True, "message": "User deleted successfully!"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def jobs_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        q = request.GET.get("q", "").strip()
        return redirect(REACT_APP_BASE_URL + f"/superadmin?tab=jobs&q={q}")

    q = request.GET.get("q", "").strip()
    if q:
        query = {
            "$or": [
                {"job_title": {"$regex": q, "$options": "i"}},
                {"company_name": {"$regex": q, "$options": "i"}},
                {"recruiter_email": {"$regex": q, "$options": "i"}},
                {"location": {"$regex": q, "$options": "i"}}
            ]
        }
    else:
        query = {}

    jobs_list = list(mongo_jobs.find(query).sort("_id", -1))
    for j in jobs_list:
        j['id_str'] = str(j['_id'])
        del j['_id']

    return JsonResponse({"jobs": jobs_list, "q": q})

@csrf_exempt
def add_job_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        return redirect(REACT_APP_BASE_URL + "/superadmin?tab=jobs")

    if request.method == "POST":
        data = _get_payload(request)
        company_name = (data.get("company_name") or "").strip()
        job_title = (data.get("job_title") or "").strip()
        job_icon = (data.get("job_icon") or "ui").strip()
        recruiter_email = (data.get("recruiter_email") or "").strip()
        employment_type = (data.get("employment_type") or "full_time").strip()
        experience_level = (data.get("experience_level") or "").strip()
        exp_min = (data.get("exp_min") or "0").strip()
        exp_max = (data.get("exp_max") or "1").strip()
        location = (data.get("location") or "").strip()
        
        is_remote_val = data.get("is_remote")
        is_remote = is_remote_val == "on" or is_remote_val is True

        if not company_name or not job_title or not recruiter_email:
            return JsonResponse({"error": "Company Name, Job Title, and Recruiter Email are required."}, status=400)

        mongo_jobs.insert_one({
            "recruiter_email": recruiter_email,
            "company_name": company_name,
            "job_title": job_title,
            "job_icon": job_icon,
            "employment_type": employment_type,
            "experience_level": experience_level,
            "experience_range": f"{exp_min}-{exp_max} Years",
            "location": location,
            "is_remote": is_remote,
        })
        return JsonResponse({"success": True, "message": "Job posting added successfully!"})

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def edit_job_view(request, job_id):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    try:
        job = mongo_jobs.find_one({"_id": ObjectId(job_id)})
    except Exception:
        return JsonResponse({"error": "Invalid Job ID"}, status=400)

    if not job:
        return JsonResponse({"error": "Job not found"}, status=404)

    job['id_str'] = str(job['_id'])
    del job['_id']

    exp_min_val = "0"
    exp_max_val = "5"
    exp_range = job.get("experience_range", "")
    if "-" in exp_range:
        try:
            parts = exp_range.split(" ")[0].split("-")
            exp_min_val = parts[0]
            exp_max_val = parts[1]
        except Exception:
            pass

    if not check_format_or_api(request):
        return redirect(REACT_APP_BASE_URL + f"/superadmin?tab=jobs&action=edit&id={job_id}")

    if request.method in ["POST", "PUT"]:
        data = _get_payload(request)
        company_name = (data.get("company_name") or "").strip()
        job_title = (data.get("job_title") or "").strip()
        job_icon = (data.get("job_icon") or "ui").strip()
        recruiter_email = (data.get("recruiter_email") or "").strip()
        employment_type = (data.get("employment_type") or "full_time").strip()
        experience_level = (data.get("experience_level") or "").strip()
        exp_min = (data.get("exp_min") or "0").strip()
        exp_max = (data.get("exp_max") or "1").strip()
        location = (data.get("location") or "").strip()
        
        is_remote_val = data.get("is_remote")
        is_remote = is_remote_val == "on" or is_remote_val is True

        if not company_name or not job_title or not recruiter_email:
            return JsonResponse({"error": "Company Name, Job Title, and Recruiter Email are required."}, status=400)

        mongo_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {
                "recruiter_email": recruiter_email,
                "company_name": company_name,
                "job_title": job_title,
                "job_icon": job_icon,
                "employment_type": employment_type,
                "experience_level": experience_level,
                "experience_range": f"{exp_min}-{exp_max} Years",
                "location": location,
                "is_remote": is_remote,
            }}
        )
        return JsonResponse({"success": True, "message": "Job posting updated successfully!"})

    return JsonResponse({
        "job": job,
        "exp_min": exp_min_val,
        "exp_max": exp_max_val
    })

@csrf_exempt
def delete_job_view(request, job_id):
    if not is_admin(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method in ["POST", "DELETE"]:
        try:
            mongo_jobs.delete_one({"_id": ObjectId(job_id)})
            return JsonResponse({"success": True, "message": "Job deleted successfully!"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def drafts_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        return redirect(REACT_APP_BASE_URL + "/superadmin?tab=drafts")

    drafts_list = list(mongo_drafts.find().sort("_id", -1))
    for d in drafts_list:
        d['id_str'] = str(d['_id'])
        del d['_id']

    return JsonResponse({"drafts": drafts_list})

@csrf_exempt
def delete_draft_view(request, draft_id):
    if not is_admin(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method in ["POST", "DELETE"]:
        try:
            mongo_drafts.delete_one({"_id": ObjectId(draft_id)})
            return JsonResponse({"success": True, "message": "Draft deleted successfully!"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def db_explorer_view(request):
    if not is_admin(request):
        if check_format_or_api(request):
            return JsonResponse({"error": "Unauthorized"}, status=401)
        return redirect(REACT_APP_BASE_URL + "/login")

    if not check_format_or_api(request):
        mongo_col = request.GET.get("mongo_col", "").strip()
        sqlite_tbl = request.GET.get("sqlite_tbl", "").strip()
        return redirect(REACT_APP_BASE_URL + f"/superadmin?tab=explorer&mongo_col={mongo_col}&sqlite_tbl={sqlite_tbl}")

    # Get SQLite tables
    sqlite_tables = []
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
            for row in cursor.fetchall():
                tname = row[0]
                cursor.execute(f"SELECT COUNT(*) FROM `{tname}`;")
                cnt = cursor.fetchone()[0]
                sqlite_tables.append({"name": tname, "count": cnt})
    except Exception as e:
        print("SQLite error:", e)

    # Get MongoDB collections
    mongo_collections = []
    try:
        for cname in mongo_db.list_collection_names():
            cnt = mongo_db[cname].count_documents({})
            mongo_collections.append({"name": cname, "count": cnt})
    except Exception as e:
        print("MongoDB error:", e)

    selected_mongo_col = request.GET.get("mongo_col", "").strip()
    selected_sqlite_tbl = request.GET.get("sqlite_tbl", "").strip()

    mongo_docs = []
    sqlite_rows = []
    sqlite_columns = []

    # If MongoDB collection is selected
    if selected_mongo_col:
        try:
            docs = list(mongo_db[selected_mongo_col].find().limit(100))
            for d in docs:
                d_id = str(d.get("_id"))
                d_copy = {k: v for k, v in d.items() if k != "_id"}
                mongo_docs.append({
                    "id": d_id,
                    "content_json": json.dumps(d_copy, indent=2, default=str)
                })
        except Exception as e:
            print("MongoDB doc fetch error:", e)

    # If SQLite table is selected
    if selected_sqlite_tbl:
        try:
            with connection.cursor() as cursor:
                cursor.execute(f"PRAGMA table_info(`{selected_sqlite_tbl}`);")
                sqlite_columns = [col[1] for col in cursor.fetchall()]

                cursor.execute(f"SELECT * FROM `{selected_sqlite_tbl}` LIMIT 100;")
                sqlite_rows = [list(row) for row in cursor.fetchall()]
        except Exception as e:
            print("SQLite rows fetch error:", e)

    context = {
        "sqlite_tables": sqlite_tables,
        "mongo_collections": mongo_collections,
        "selected_mongo_col": selected_mongo_col,
        "selected_sqlite_tbl": selected_sqlite_tbl,
        "mongo_docs": mongo_docs,
        "sqlite_rows": sqlite_rows,
        "sqlite_columns": sqlite_columns,
    }
    return JsonResponse(context)

@csrf_exempt
def delete_mongo_document(request, collection_name, doc_id):
    if not is_admin(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method in ["POST", "DELETE"]:
        try:
            mongo_db[collection_name].delete_one({"_id": ObjectId(doc_id)})
            return JsonResponse({"success": True, "message": f"Document deleted from {collection_name} successfully!"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method not allowed"}, status=405)
