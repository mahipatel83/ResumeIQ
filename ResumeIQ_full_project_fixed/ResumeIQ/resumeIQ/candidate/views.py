from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
import json
import re
import os
import logging
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

logger = logging.getLogger(__name__)

# Ensure NLTK data is downloaded and accessible
def setup_nltk():
    try:
        nltk.data.find('tokenizers/punkt')
        nltk.data.find('corpora/stopwords')
    except LookupError:
        # Fallback to user AppData and temp folders
        import tempfile
        nltk_data_dir = os.path.join(tempfile.gettempdir(), 'nltk_data')
        os.makedirs(nltk_data_dir, exist_ok=True)
        if nltk_data_dir not in nltk.data.path:
            nltk.data.path.append(nltk_data_dir)
        nltk.download('punkt', download_dir=nltk_data_dir, quiet=True)
        nltk.download('stopwords', download_dir=nltk_data_dir, quiet=True)

setup_nltk()

REACT_APP_BASE_URL = "http://localhost:5173"

def dashboard(request):
    user_email = request.session.get("user_email")
    if not user_email:
        return redirect(REACT_APP_BASE_URL + "/login")
    return redirect(REACT_APP_BASE_URL + "/dashboard")

def candidate_dashboard_api(request):
    user_email = request.session.get("user_email")
    if not user_email:
        return JsonResponse({"error": "Not logged in"}, status=401)
    my_applications = []
    hired_count = 0
    serialized_jobs = []
    user_name = "User"
    ats_analysis = None
    try:
        from resumeIQ.mongodb import users, applications, jobs
        user = users.find_one({"email": user_email})
        user_name = user.get("fullname", "User") if user else "User"
        ats_analysis = user.get("ats_analysis", None)

        # Pull this candidate's own applications so they can see live status
        # (Under Review / Hired / Not Selected) for every job they applied to.
        my_applications = list(
            applications.find({"candidate_email": user_email}).sort("_id", -1)
        )
        for app in my_applications:
            app["id_str"] = str(app["_id"])
            del app["_id"]
            if "applied_at" in app:
                del app["applied_at"]
        hired_count = sum(1 for app in my_applications if app.get("status") == "Hired")

        # Fetch and serialize recruiter job posts
        all_recruiter_jobs = list(jobs.find({}))
        for j in all_recruiter_jobs:
            job_obj = {
                "job_id": str(j["_id"]),
                "title": j.get("job_title", ""),
                "company": j.get("company_name", ""),
                "location": j.get("location", ""),
                "salary": j.get("salary_display") or "Competitive",
                "type": "Full-time" if j.get("employment_type") == "full_time" else ("Part-time" if j.get("employment_type") == "part_time" else "Contract"),
                "requirements": j.get("required_skills", "") or ", ".join(_infer_job_skills(j.get("job_title", ""))),
                "desc": f"Experience: {j.get('experience_range', '0-2 Years')}. Level: {j.get('experience_level', 'entry').capitalize()} Level.",
                "experience_range": j.get("experience_range", "0-2 Years"),
                "job_description": j.get("job_description", "")
            }
            if ats_analysis:
                from .success_predictor import predict_success_probability
                pred = predict_success_probability(ats_analysis, j)
                job_obj["success_probability"] = pred["probability"]
                job_obj["success_rating"] = pred["rating"]
                job_obj["success_message"] = pred["message"]
            serialized_jobs.append(job_obj)
    except Exception as e:
        print("Dashboard query error:", e)

    return JsonResponse({
        "user_name": user_name,
        "ats_analysis": ats_analysis,
        "my_applications": my_applications,
        "hired_count": hired_count,
        "recruiter_jobs": serialized_jobs,
    })



@csrf_exempt
def apply_job(request):
    """Candidate applies to a job posted by a recruiter. Creates an
    application record (with the candidate's latest ATS score) and a
    notification for the recruiter who posted the job."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user_email = request.session.get("user_email")
    if not user_email:
        return JsonResponse({"error": "Please log in to apply for jobs."}, status=401)

    job_id = request.POST.get("job_id", "").strip()
    notify_hired = request.POST.get("notify_hired") == "true"

    if not job_id:
        return JsonResponse({"error": "This listing isn't a real job post, so it can't be applied to."}, status=400)

    try:
        from resumeIQ.mongodb import jobs, users, applications, notifications
        from bson.objectid import ObjectId

        job = jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            return JsonResponse({"error": "This job post no longer exists."}, status=404)

        candidate = users.find_one({"email": user_email}) or {}
        candidate_name = candidate.get("fullname", "Candidate")
        ats_score = candidate.get("ats_score", 0)
        resume_pdf_url = candidate.get("resume_pdf_url") or None
        resume_text = candidate.get("resume_text", "")

        recruiter_email = job.get("recruiter_email")
        job_title = job.get("job_title", "Untitled Role")
        company_name = job.get("company_name", "Company")

        # Prevent duplicate applications to the same job by the same candidate
        existing = applications.find_one({
            "job_id": job_id,
            "candidate_email": {"$regex": f"^{user_email}$", "$options": "i"}
        })
        if existing:
            return JsonResponse({"success": True, "already_applied": True,
                                  "message": "You've already applied to this job."})

        applications.insert_one({
            "job_id": job_id,
            "recruiter_email": recruiter_email,
            "candidate_email": user_email,
            "candidate_name": candidate_name,
            "job_title": job_title,
            "company_name": company_name,
            "ats_score": ats_score,
            # Snapshot of the resume at the time of applying, so the
            # recruiter can always open the exact resume PDF/text this
            # application was submitted with.
            "resume_pdf_url": resume_pdf_url,
            "resume_text": resume_text,
            "notify_hired": notify_hired,
            "status": "Under Review",
            "applied_on": datetime.now().strftime("%b %d, %Y"),
            "applied_at": datetime.now(),
        })

        if recruiter_email:
            notifications.insert_one({
                "recruiter_email": recruiter_email,
                "message": f"{candidate_name} applied for {job_title}",
                "type": "application",
                "read": False,
                "created_at": datetime.now(),
            })

        return JsonResponse({"success": True, "message": "Application submitted successfully!"})

    except Exception as e:
        logger.warning("apply_job failed: %s", e)
        return JsonResponse({"error": "Could not submit your application. Please try again."}, status=500)


@csrf_exempt
def track_job_view(request, job_id):
    """Increments a job post's view counter. Fired when a candidate opens
    the 'View Details' modal for a real (non-demo) job listing."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        from resumeIQ.mongodb import jobs
        from bson.objectid import ObjectId
        jobs.update_one({"_id": ObjectId(job_id)}, {"$inc": {"views": 1}})
        return JsonResponse({"success": True})
    except Exception as e:
        logger.warning("track_job_view failed: %s", e)
        return JsonResponse({"success": False})


def _extract_pdf_text(file_bytes):
    """
    Try several pure pip-installable strategies to pull text out of an
    uploaded PDF, in order of reliability. No system-level binaries
    (no tesseract, no poppler) are required — everything here works with
    just `pip install -r requirements.txt`.

    Note: this cannot read scanned/image-only PDFs (photos or scans of a
    resume with no real text layer) — that would require OCR, which needs
    a system package. Those PDFs must be converted to a text-based
    PDF/DOCX/TXT before uploading.

    Every failure is logged with its real exception instead of being
    silently swallowed.
    """
    import io

    # 1. pdfplumber - good general-purpose extractor
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            text = "\n".join(p.extract_text() or "" for p in pdf.pages).strip()
        if text:
            return text
    except Exception as e:
        logger.warning("pdfplumber extraction failed: %s", e)

    # 2. PyPDF2 - fallback, sometimes succeeds where pdfplumber fails
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        if text:
            return text
    except Exception as e:
        logger.warning("PyPDF2 extraction failed: %s", e)

    # 3. PyMuPDF (fitz) - handles some encodings/fonts the above two choke on
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc).strip()
        doc.close()
        if text:
            return text
    except Exception as e:
        logger.warning("PyMuPDF extraction failed: %s", e)

    return ""


def _generate_resume_pdf(resume_text):
    """Builds a simple, readable PDF from plain resume text. Used when a
    candidate uploads a DOCX/TXT resume or pastes text instead of a PDF, so
    recruiters can still open a 'View Resume (PDF)' regardless of the
    original format the candidate submitted."""
    try:
        import fitz  # PyMuPDF
        import textwrap

        PAGE_WIDTH, PAGE_HEIGHT = 595, 842  # A4 in points
        MARGIN = 50
        FONT_SIZE = 10.5
        LINE_HEIGHT = 14
        CHARS_PER_LINE = 95
        LINES_PER_PAGE = int((PAGE_HEIGHT - 2 * MARGIN) / LINE_HEIGHT)

        # Wrap each line to a fixed width so it fits neatly on the page,
        # preserving blank lines so sections stay visually separated.
        wrapped_lines = []
        for raw_line in resume_text.splitlines():
            raw_line = raw_line.rstrip()
            if not raw_line:
                wrapped_lines.append("")
                continue
            wrapped_lines.extend(textwrap.wrap(raw_line, width=CHARS_PER_LINE) or [""])

        if not wrapped_lines:
            wrapped_lines = [""]

        doc = fitz.open()
        for i in range(0, len(wrapped_lines), LINES_PER_PAGE):
            page = doc.new_page(width=PAGE_WIDTH, height=PAGE_HEIGHT)
            y = MARGIN
            for line in wrapped_lines[i:i + LINES_PER_PAGE]:
                if line:
                    page.insert_text((MARGIN, y), line, fontsize=FONT_SIZE, fontname="helv")
                y += LINE_HEIGHT

        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes
    except Exception as e:
        logger.warning("Could not generate PDF from resume text: %s", e)
        return None


def _save_candidate_resume_pdf(user_email, file_bytes):
    """Persist the candidate's actual uploaded PDF resume to disk so
    recruiters can open the real PDF (not just extracted text) from the
    Applications feature. Overwrites any previous resume for this candidate."""
    try:
        from django.conf import settings
        safe_email = re.sub(r'[^a-zA-Z0-9_.-]', '_', user_email)
        resumes_dir = os.path.join(settings.MEDIA_ROOT, "resumes")
        os.makedirs(resumes_dir, exist_ok=True)
        file_path = os.path.join(resumes_dir, f"{safe_email}.pdf")
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        return f"/{settings.MEDIA_URL}resumes/{safe_email}.pdf"
    except Exception as e:
        logger.warning("Could not save resume PDF: %s", e)
        return None


@csrf_exempt
def analyze_resume(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user_email = request.session.get("user_email")
    user_fullname = "User"
    if user_email:
        try:
            from resumeIQ.mongodb import users
            u = users.find_one({"email": user_email})
            if u:
                user_fullname = u.get("fullname", "User")
        except Exception:
            pass

    resume_text = ""
    resume_pdf_url = None
    model_type = "rules"

    if request.content_type and "multipart" in request.content_type:
        resume_text = request.POST.get("resume_text", "").strip()
        model_type = request.POST.get("model_type", "rules").strip()
        uploaded_file = request.FILES.get("resume_file")

        if uploaded_file and not resume_text:
            file_name = uploaded_file.name.lower()
            try:
                file_bytes = uploaded_file.read()

                if file_name.endswith(".txt"):
                    resume_text = file_bytes.decode("utf-8", errors="ignore")

                elif file_name.endswith(".pdf"):
                    resume_text = _extract_pdf_text(file_bytes)

                    if not resume_text:
                        return JsonResponse({
                            "error": "No readable text could be extracted from your PDF resume. "
                                     "This usually means it's a scanned/image-only PDF (no selectable text). "
                                     "Please upload a text-based PDF, or convert it to DOCX/TXT and try again."
                        }, status=400)

                    # Keep the actual PDF on disk so a recruiter can open the
                    # real resume file (not just the extracted text) later.
                    if user_email:
                        resume_pdf_url = _save_candidate_resume_pdf(user_email, file_bytes)

                elif file_name.endswith((".docx", ".doc")):
                    try:
                        import docx, io
                        doc = docx.Document(io.BytesIO(file_bytes))
                        resume_text = "\n".join(p.text for p in doc.paragraphs)
                    except ImportError:
                        return JsonResponse({
                            "error": "DOCX parsing library not installed. Please install python-docx."
                        }, status=400)
                else:
                    resume_text = file_bytes.decode("utf-8", errors="ignore")

            except Exception as e:
                return JsonResponse({"error": f"Could not read file: {str(e)}"}, status=400)
    else:
        try:
            body = json.loads(request.body)
            resume_text = body.get("resume_text", "").strip()
            model_type = body.get("model_type", "rules").strip()
        except Exception:
            return JsonResponse({"error": "Invalid request body"}, status=400)

    resume_text = resume_text.strip()
    if not resume_text:
        return JsonResponse({"error": "No resume content found. Please upload a file or paste text."}, status=400)

    # If the candidate didn't upload an actual PDF (they uploaded a DOCX/TXT
    # file, or just pasted text), build a simple readable PDF from the
    # extracted text anyway — so recruiters can always open a
    # "View Resume (PDF)" regardless of how the candidate submitted it.
    if user_email and not resume_pdf_url:
        generated_pdf_bytes = _generate_resume_pdf(resume_text)
        if generated_pdf_bytes:
            resume_pdf_url = _save_candidate_resume_pdf(user_email, generated_pdf_bytes)

    if model_type == "logistic_regression":
        from .ml_models import run_ml_analysis
        result = run_ml_analysis(resume_text, default_name=user_fullname)
    elif model_type == "langchain":
        from .langchain_agent import run_langchain_analysis
        result = run_langchain_analysis(resume_text, default_name=user_fullname)
    else:
        result = _run_analysis(resume_text, default_name=user_fullname)


    # Save ATS score and analysis results in the database
    if user_email:
        try:
            from resumeIQ.mongodb import users
            update_fields = {
                "ats_score": result["ats_score"],
                "ats_analysis": result,
                "resume_text": resume_text
            }
            # Only overwrite the stored PDF link if we actually have a new
            # one this time (uploaded or freshly generated) — don't wipe out
            # a previous one otherwise.
            if resume_pdf_url:
                update_fields["resume_pdf_url"] = resume_pdf_url
            users.update_one(
                {"email": user_email},
                {"$set": update_fields}
            )
        except Exception as e:
            print("Database update error:", e)

    return JsonResponse(result)


# ──────────────────────────────────────────────────────────────
#  SMART KEYWORD MATCHER & PREPROCESSING
# ──────────────────────────────────────────────────────────────

SKILL_DEFINITIONS = [
    # Languages
    ("Python",          [r"\bpython\b"]),
    ("JavaScript",      [r"\bjavascript\b", r"\bjs\b"]),
    ("TypeScript",      [r"\btypescript\b", r"\bts\b"]),
    ("Java",            [r"\bjava\b"]),
    ("C++",             [r"\bc\+\+"]),
    ("C#",              [r"\bc#\b", r"\bcsharp\b"]),
    ("Ruby",            [r"\bruby\b"]),
    ("Go / Golang",     [r"\bgolang\b", r"\b(?<![a-z])go\b"]),
    ("Rust",            [r"\brust\b"]),
    ("Swift",           [r"\bswift\b"]),
    ("Kotlin",          [r"\bkotlin\b"]),
    ("PHP",             [r"\bphp\b"]),

    # Frontend
    ("React",           [r"\breact(?:\.?js)?\b"]),
    ("Angular",         [r"\bangular(?:\.?js)?\b"]),
    ("Vue",             [r"\bvue(?:\.?js)?\b"]),
    ("Next.js",         [r"\bnext\.?js\b"]),
    ("HTML",            [r"\bhtml\b", r"\bhtml5\b"]),
    ("CSS",             [r"\bcss\b", r"\bcss3\b"]),
    ("Tailwind CSS",    [r"\btailwind\b"]),
    ("Bootstrap",       [r"\bbootstrap\b"]),

    # Backend
    ("Node.js",         [r"\bnode\.?js\b", r"\bnode\b"]),
    ("Django",          [r"\bdjango\b"]),
    ("Flask",           [r"\bflask\b"]),
    ("FastAPI",         [r"\bfastapi\b"]),
    ("Spring Boot",     [r"\bspring\s*boot\b", r"\bspring\b"]),
    ("Express.js",      [r"\bexpress(?:\.?js)?\b"]),

    # Databases
    ("SQL",             [r"\bsql\b"]),
    ("MySQL",           [r"\bmysql\b"]),
    ("PostgreSQL",      [r"\bpostgresql\b", r"\bpostgres\b"]),
    ("MongoDB",         [r"\bmongodb\b", r"\bmongo\b"]),
    ("Redis",           [r"\bredis\b"]),
    ("SQLite",          [r"\bsqlite\b"]),
    ("Firebase",        [r"\bfirebase\b"]),

    # DevOps / Cloud
    ("Git",             [r"\bgit\b", r"\bgithub\b"]),
    ("Docker",          [r"\bdocker\b"]),
    ("Kubernetes",      [r"\bkubernetes\b", r"\bk8s\b"]),
    ("AWS",             [r"\baws\b", r"\bamazon\s+web\s+services\b"]),
    ("Azure",           [r"\bazure\b"]),
    ("GCP",             [r"\bgcp\b", r"\bgoogle\s+cloud\b"]),
    ("CI/CD",           [r"\bci\s*/\s*cd\b", r"\bcontinuous\s+integration\b"]),
    ("Linux",           [r"\blinux\b", r"\bubuntu\b"]),

    # APIs & Architecture
    ("REST API",        [r"\brest(?:ful)?\s*api\b", r"\brest\b"]),
    ("GraphQL",         [r"\bgraphql\b"]),

    # Data / ML / AI
    ("Machine Learning",[r"\bmachine\s+learning\b", r"\bml\b"]),
    ("Deep Learning",   [r"\bdeep\s+learning\b", r"\bdl\b"]),
    ("TensorFlow",      [r"\btensorflow\b"]),
    ("PyTorch",         [r"\bpytorch\b"]),
    ("Scikit-learn",    [r"\bscikit[\s\-]?learn\b", r"\bsklearn\b"]),
    ("Pandas",          [r"\bpandas\b"]),
    ("NumPy",           [r"\bnumpy\b"]),
    ("Data Analysis",   [r"\bdata\s+anal(?:ysis|ytics)\b"]),
]

def _skill_present(patterns: list, text: str) -> bool:
    for pat in patterns:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False

# NLP Heuristics for Extracting Candidate Information
def extract_email(text):
    match = re.search(r'[\w\.\-]+@[\w\.\-]+\.\w+', text)
    return match.group(0) if match else "Not found"

def extract_phone(text):
    match = re.search(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+?\d{10,12}', text)
    return match.group(0).strip() if match else "Not found"

def extract_name(text, default_name="User"):
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines[:5]:
        words = line.split()
        if 2 <= len(words) <= 3:
            if all(w[0].isupper() for w in words if w.isalpha()) and not re.search(r'\d|@|\.com|http|:|/|\\', line):
                return line
    return default_name

SECTION_HEADERS = (
    r'(?:experience|work\s+history|employment|education|projects?|summary|'
    r'objective|certifications?|achievements?|awards?|references?|interests?|'
    r'skills|technologies|tech\s+stack|competencies|proficiencies|tools)'
)

def _extract_section_text(text: str, header_pat: 're.Pattern') -> str:
    """Return the raw text of the first section whose header matches
    header_pat, stopping at the next recognized section header."""
    next_header_pat = re.compile(r'^\s*' + SECTION_HEADERS + r'\s*:?\s*$', re.IGNORECASE)

    lines = text.split('\n')
    section_lines = []
    in_section = False
    for line in lines:
        stripped = line.strip()
        if not in_section:
            if header_pat.match(stripped):
                in_section = True
                inline = header_pat.sub('', stripped).strip(" :-")
                if inline:
                    section_lines.append(inline)
            continue
        if not stripped:
            continue
        if next_header_pat.match(stripped) and not header_pat.match(stripped):
            break
        section_lines.append(stripped)

    return "\n".join(section_lines)


def extract_skills_section(text: str) -> list:
    """
    Pull the *actual* skills the candidate listed on their resume, straight
    from their own "Skills" / "Technologies" / "Tech Stack" section — rather
    than only relying on the fixed SKILL_DEFINITIONS dictionary. This lets
    the analyzer surface tools/skills the candidate genuinely has even if
    they aren't in our predefined keyword list.
    """
    header_pat = re.compile(
        r'^\s*(skills|technical\s+skills|technologies|tech\s+stack|core\s+competencies|'
        r'competencies|proficiencies|tools?\s*&?\s*technologies)\s*:?\s*$',
        re.IGNORECASE
    )
    raw = _extract_section_text(text, header_pat).replace("\n", " ")

    if not raw.strip():
        return []

    tokens = re.split(r'[,\|•·;\n]+|\s{2,}', raw)

    skills = []
    seen = set()
    for tok in tokens:
        skill = tok.strip(" -–—:.")
        if not skill or len(skill) > 40:
            continue
        if skill.lower() in {"and", "etc", "etc.", "others", "more"}:
            continue
        key = skill.lower()
        if key in seen:
            continue
        seen.add(key)
        display = skill if skill.isupper() and len(skill) <= 5 else skill.title()
        skills.append(display)

    return skills[:25]


MONTH_RX = (r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|'
            r'aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)')

def extract_experience_level(text, current_year=None):
    """
    Determine total years of experience without guessing. Tries, in order:
    1. An explicit "X years of experience" style statement.
    2. Summing the durations of every "<start> - <end>" employment date
       range found in the resume (supports plain years and "Mon YYYY"
       formats, and "present"/"current" as an open end date).
    If neither is found, honestly reports "Fresher" rather than defaulting
    to a made-up number — that fallback was pulling unrelated resumes
    toward the same ATS score.
    """
    if current_year is None:
        current_year = datetime.now().year

    match = re.search(r'(\d+(?:\.\d+)?)\s*(?:years?|yrs?)(?:\s*(?:of)?\s*experience)?', text, re.IGNORECASE)
    if match:
        val = float(match.group(1))
        if val.is_integer():
            return f"{int(val)} Years"
        return f"{val} Years"

    range_pat = re.compile(
        r'(?:' + MONTH_RX + r'\.?\s+)?((?:19|20)\d{2})\s*(?:[-–—]|to)\s*'
        r'(?:(?:' + MONTH_RX + r'\.?\s+)?((?:19|20)\d{2})|(present|current))',
        re.IGNORECASE
    )

    # Only scan the Experience/Work-History/Employment section for date
    # ranges — otherwise an "Education (2016-2020)" line gets miscounted
    # as work experience. Fall back to the whole document only if no such
    # section can be found at all.
    exp_header_pat = re.compile(
        r'^\s*(experience|work\s+history|employment|professional\s+experience|'
        r'work\s+experience)\s*:?\s*$',
        re.IGNORECASE
    )
    experience_section = _extract_section_text(text, exp_header_pat)
    scan_text = experience_section if experience_section.strip() else text

    total_months = 0
    found_any = False
    for m in range_pat.finditer(scan_text):
        found_any = True
        start_year = int(m.group(1))
        if m.group(3):  # present/current
            end_year = current_year
        else:
            end_year = int(m.group(2))
        span_years = end_year - start_year
        if span_years < 0:
            continue
        total_months += max(span_years, 0.5) * 12 if span_years == 0 else span_years * 12

    if found_any and total_months > 0:
        years = round(total_months / 12, 1)
        if years.is_integer():
            return f"{int(years)} Years"
        return f"{years} Years"

    return "Fresher"

def _run_analysis(resume_text: str, default_name: str = "User") -> dict:
    word_count = len(resume_text.split())

    # NLP preprocess resume text using NLTK (lowercase, tokenize, remove stopwords)
    try:
        tokens = word_tokenize(resume_text.lower())
        stop_words = set(stopwords.words('english'))
        filtered_tokens = [w for w in tokens if w.isalnum() and w not in stop_words]
        nlp_processed_text = " ".join(filtered_tokens)
    except Exception:
        nlp_processed_text = resume_text.lower()

    # ── 1. SKILL MATCHING ────────────────────────────────────
    matched_skills = []
    missing_skills = []

    for label, patterns in SKILL_DEFINITIONS:
        if _skill_present(patterns, resume_text):
            matched_skills.append(label)
        else:
            missing_skills.append(label)

    total_skills = len(SKILL_DEFINITIONS)
    keyword_match_pct = round(len(matched_skills) / total_skills * 100) if total_skills > 0 else 0

    # Fetch the skills the candidate actually listed in their own Skills
    # section (on top of the fixed keyword dictionary above), so the
    # summary reflects what's really on the resume rather than only the
    # predefined skill list.
    resume_declared_skills = extract_skills_section(resume_text)

    def _normalize(s):
        s = s.lower().strip()
        return s[:-1] if s.endswith("s") and not s.endswith("ss") else s

    known_norm = {_normalize(s) for s in matched_skills}
    all_resume_skills = list(matched_skills)
    for skill in resume_declared_skills:
        norm = _normalize(skill)
        if norm not in known_norm:
            known_norm.add(norm)
            all_resume_skills.append(skill)

    # ── 2. SECTION DETECTION ────────────────────────────────
    has_experience = bool(re.search(
        r'\b(experience|work\s+history|employment|worked\s+at|working\s+at)\b',
        resume_text, re.IGNORECASE))
    has_education  = bool(re.search(
        r'\b(education|degree|b\.?tech|b\.?e\.?|m\.?tech|m\.?sc|bachelor|master|phd|university|college|institute)\b',
        resume_text, re.IGNORECASE))
    has_skills     = bool(re.search(
        r'\b(skills|technologies|tech\s+stack|competencies|proficiencies|tools)\b',
        resume_text, re.IGNORECASE))
    has_summary    = bool(re.search(
        r'\b(summary|objective|profile|about\s+me|career\s+goal)\b',
        resume_text, re.IGNORECASE))
    has_projects   = bool(re.search(
        r'\b(project|projects|built|developed|created|implemented)\b',
        resume_text, re.IGNORECASE))
    has_contact    = bool(re.search(
        r'[\w\.\-]+@[\w\.\-]+\.\w+|\+?[\d\s\-\(\)]{8,}',
        resume_text, re.IGNORECASE))
    has_metrics    = bool(re.search(
        r'\b\d+\s*%|\$\s*\d+|\b\d+\s*(years?|months?|projects?|teams?|people|users?|clients?|lakh|crore)\b'
        r'|increased|decreased|reduced|improved|optimized|saved|grew',
        resume_text, re.IGNORECASE))

    # ── 3. EXTRACT CANDIDATE INFO ───────────────────────────
    extracted_name = extract_name(resume_text, default_name=default_name)
    extracted_email = extract_email(resume_text)
    extracted_phone = extract_phone(resume_text)
    extracted_experience = extract_experience_level(resume_text)

    # Convert key skills list to a nice preview — reflects the skills the
    # resume actually contains (dictionary matches + anything the candidate
    # explicitly listed in their own Skills section).
    skills_preview = ", ".join(all_resume_skills[:8]) if all_resume_skills else "None matched"

    # ── 4. SCORE BREAKDOWN (Total out of 100) ────────────────
    # Components as shown in image: Skills Match (/40), Keyword Match (/20), Content Quality (/20), Formatting (/10), Experience (/10)
    
    # 1. Skills Match (40 pts)
    skills_score = min(40, round(keyword_match_pct * 0.4))
    
    # 2. Keyword Match (20 pts)
    keyword_score = min(20, len(matched_skills) * 1.5)
    if has_skills:
        keyword_score += 2
    keyword_score = min(20, round(keyword_score))

    # 3. Content Quality (20 pts)
    quality_score = 5
    if word_count >= 300:
        quality_score += 5
    if word_count >= 500:
        quality_score += 3
    if has_metrics:
        quality_score += 7
    quality_score = min(20, quality_score)

    # 4. Formatting (10 pts)
    formatting_score = 3
    if has_contact:
        formatting_score += 3
    if has_education:
        formatting_score += 2
    if has_experience:
        formatting_score += 2
    formatting_score = min(10, formatting_score)

    # 5. Experience (10 pts)
    try:
        years_num = float(extracted_experience.split()[0])
    except Exception:
        years_num = 0
    
    if years_num >= 5:
        experience_score = 10
    elif years_num >= 3:
        experience_score = 8
    elif years_num >= 2:
        experience_score = 6
    elif years_num >= 1:
        experience_score = 4
    else:
        experience_score = 2

    # Total score
    score = int(skills_score + keyword_score + quality_score + formatting_score + experience_score)
    score = max(5, min(100, score))

    # ── 5. STRENGTHS, IMPROVEMENTS & SUGGESTIONS ───────────
    strengths = []
    if has_contact:
        strengths.append("Well structured and easy to read")
    if has_metrics:
        strengths.append("Good use of action verbs and impact metrics")
    if len(matched_skills) >= 10:
        strengths.append("Relevant skills are well mentioned in technical profiles")
    if has_projects:
        strengths.append("Projects are well described showing hands-on experience")
    if has_experience and has_education:
        strengths.append("Proper use of standard layout sections")
    if not strengths:
        strengths.append("Resume contains core structural sections.")

    areas_to_improve = []
    if len(matched_skills) < 12:
        areas_to_improve.append("Add more technical skills to match target roles")
    if not has_projects:
        areas_to_improve.append("Include practical projects and contributions")
    if not has_metrics:
        areas_to_improve.append("Quantify your achievements with performance percentages")
    if len(matched_skills) < 8:
        areas_to_improve.append("Improve keyword density for specialized tools")
    if not has_summary:
        areas_to_improve.append("Add a professional summary section at the top")
    if not areas_to_improve:
        areas_to_improve.append("Add industry-recognized certifications")
        areas_to_improve.append("Include minor/academic training details")

    # Filter top missing skills to match image format
    priority_missing = ["Docker", "Kubernetes", "AWS", "REST API", "CI/CD", "GraphQL", "Python", "React", "MongoDB"]
    sorted_missing = sorted(
        missing_skills,
        key=lambda s: priority_missing.index(s) if s in priority_missing else 999
    )
    top_missing_skills = sorted_missing[:6]
    # Fallback to standard badges if somehow they have all skills
    if not top_missing_skills:
        top_missing_skills = ["Docker", "Kubernetes", "AWS", "REST API", "CI/CD", "GraphQL"]

    ai_suggestions = []
    if not has_summary:
        ai_suggestions.append("Add a summary to highlight your key strengths.")
    if len(matched_skills) < 15:
        ai_suggestions.append("Use more industry specific keywords throughout your CV.")
    if not has_metrics:
        ai_suggestions.append("Quantify your achievements with numbers (e.g. reduced build time by 30%).")
    ai_suggestions.append("Include professional certifications and courses.")
    ai_suggestions.append("Ensure your contact details include LinkedIn or GitHub profiles.")

    # ── 6. FORMATTING AUDIT (For breakdown table compatibility) ──
    formatting_issues = []
    if not has_contact:
        formatting_issues.append({
            "type": "danger",
            "title": "No Contact Information Found",
            "desc": "Add your email and phone number at the top of your resume.",
            "field": "bEmail"
        })
    if not has_summary:
        formatting_issues.append({
            "type": "warning",
            "title": "Missing Professional Summary",
            "desc": "Add a 2–3 sentence career objective at the top.",
            "field": "bSummary"
        })
    if not has_skills:
        formatting_issues.append({
            "type": "danger",
            "title": "No Skills Section Detected",
            "desc": "A dedicated Technical Skills section is critical for ATS scanning.",
            "field": "bSkills"
        })
    if not formatting_issues:
        formatting_issues.append({
            "type": "positive",
            "title": "Structure Looks Good ✓",
            "desc": "All key sections are present and well-structured.",
            "field": None
        })

    # ── 7. JOB RECOMMENDATIONS (ML Similarity) ────────────
    job_recommendations = _get_job_recommendations(nlp_processed_text, all_resume_skills)

    return {
        "ats_score": score,
        "score_breakdown": {
            "skills_match": int(skills_score),
            "keyword_match": int(keyword_score),
            "content_quality": int(quality_score),
            "formatting": int(formatting_score),
            "experience": int(experience_score)
        },
        "resume_summary": {
            "name": extracted_name,
            "email": extracted_email,
            "phone": extracted_phone,
            "experience": extracted_experience,
            "key_skills": skills_preview
        },
        "strengths": strengths,
        "areas_to_improve": areas_to_improve,
        "missing_keywords": top_missing_skills,
        "ai_suggestions": ai_suggestions,
        "job_recommendations": job_recommendations,
        "formatting_issues": formatting_issues,
        "keyword_match_percent": keyword_match_pct,
        "matched_keywords": all_resume_skills[:12],
        "word_count": word_count
    }


# Real jobs posted by recruiters only store a title/experience/location —
# there's no "required skills" field in the job posting form. To still be
# able to compute a genuine skill-overlap match (instead of faking a number),
# we infer the expected skill set for a role from its title.
TITLE_SKILL_MAP = [
    (r'\b(django|python)\b',              ["Python", "Django", "SQL", "REST API"]),
    (r'\bflask\b',                        ["Python", "Flask", "SQL", "Git"]),
    (r'\b(backend|back-end)\b',            ["Python", "REST API", "SQL", "Node.js"]),
    (r'\b(frontend|front-end)\b',          ["JavaScript", "React", "HTML", "CSS"]),
    (r'\bfull[\s-]?stack\b',               ["JavaScript", "React", "Node.js", "SQL"]),
    (r'\breact\b',                         ["JavaScript", "React", "HTML", "CSS"]),
    (r'\bjava\b(?!\s*script)',             ["Java", "Spring Boot", "SQL"]),
    (r'\b(data\s*scien|machine\s*learning|ml\s*engineer)\b',
                                            ["Python", "Machine Learning", "Pandas", "NumPy"]),
    (r'\bdata\s*analy',                    ["SQL", "Python", "Data Analysis", "Pandas"]),
    (r'\b(devops|site\s*reliability|sre)\b',
                                            ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux"]),
    (r'\bcloud\b',                         ["AWS", "Azure", "GCP", "Docker"]),
    (r'\b(android|ios|mobile)\b',          ["Kotlin", "Java", "Swift"]),
    (r'\b(application\s*developer|software\s*(developer|engineer))\b',
                                            ["Python", "SQL", "Git", "REST API"]),
]

def _infer_job_skills(job_title: str) -> list:
    title_lower = (job_title or "").lower()
    for pattern, skills in TITLE_SKILL_MAP:
        if re.search(pattern, title_lower):
            return skills
    return []


def _get_job_recommendations(resume_text: str, matched_skills: list) -> list:
    try:
        from resumeIQ.mongodb import jobs
        all_jobs = list(jobs.find({}))
    except Exception:
        all_jobs = []

    merged_jobs = []
    for job in all_jobs:
        job_id = str(job.get("_id", ""))
        job_title = job.get("job_title", "Software Engineer")
        # Real job postings don't have a dedicated skills field, so infer
        # the expected skill set from the role title. Fall back to any
        # explicit "required_skills"/"skills" field if one is ever added.
        explicit_skills = job.get("required_skills") or job.get("skills")
        if isinstance(explicit_skills, list):
            required_skills = explicit_skills
        elif isinstance(explicit_skills, str) and explicit_skills.strip():
            required_skills = [s.strip() for s in explicit_skills.split(",") if s.strip()]
        else:
            required_skills = _infer_job_skills(job_title)

        merged_jobs.append({
            "job_id": job_id,
            "job_title": job_title,
            "company_name": job.get("company_name", "Tech Company"),
            "location": job.get("location", "Remote"),
            "experience_range": job.get("experience_range", "0-2 Yrs"),
            "employment_type": job.get("employment_type", "full_time"),
            "required_skills": required_skills,
            "salary_display": job.get("salary_display") or "Not specified",
        })

    if not merged_jobs:
        # No real recruiter postings exist yet — nothing genuine to
        # recommend, so return an empty list instead of made-up companies.
        return []

    # Candidate's skill set (case-insensitive) for exact overlap matching
    candidate_skill_set = {s.strip().lower() for s in matched_skills if s.strip()}

    # Contextual similarity using scikit-learn TF-IDF & Cosine Similarity —
    # this captures relevance beyond the fixed skill vocabulary (role
    # wording, location, seniority, etc.)
    corpus = [resume_text]
    for job in merged_jobs:
        job_repr = (
            f"{job['job_title']} at {job['company_name']} in {job['location']}. "
            f"Requirements: {', '.join(job['required_skills'])}. Type: {job['employment_type']}"
        )
        corpus.append(job_repr.lower())

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(corpus)
        similarity_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
    except Exception:
        similarity_scores = [0.0 for _ in merged_jobs]

    MIN_MATCH_THRESHOLD = 25  # only recommend jobs that genuinely match

    results = []
    for idx, job in enumerate(merged_jobs):
        required = job["required_skills"]
        required_lower = [s.lower() for s in required]
        overlap = [s for s in required if s.lower() in candidate_skill_set]

        # Exact skill-overlap percentage — how many of the role's required
        # skills the candidate's resume actually demonstrates.
        skill_overlap_pct = (len(overlap) / len(required_lower) * 100) if required_lower else 0.0

        # Contextual TF-IDF cosine similarity (0-1 -> 0-100)
        context_pct = max(0.0, min(1.0, float(similarity_scores[idx]))) * 100

        # Final match score: real skill overlap is the primary signal,
        # contextual similarity is a smaller supporting signal. No
        # artificial floor/ceiling — a genuine 0% or 100% is possible.
        if required_lower:
            match_pct = round(0.75 * skill_overlap_pct + 0.25 * context_pct)
        else:
            # No known required-skill list for this role — fall back to
            # contextual similarity alone.
            match_pct = round(context_pct)
        match_pct = max(0, min(100, match_pct))

        if match_pct < MIN_MATCH_THRESHOLD:
            continue

        emp_type = "Full-time"
        if job["employment_type"] == "part_time":
            emp_type = "Part-time"
        elif job["employment_type"] == "contract":
            emp_type = "Contract"

        from .success_predictor import predict_success_probability
        candidate_analysis = {
            "resume_summary": {
                "experience": extract_experience_level(resume_text)
            },
            "matched_keywords": matched_skills,
            "ats_score": match_pct
        }
        job_post_dict = {
            "experience_range": job["experience_range"],
            "required_skills": job["required_skills"]
        }
        pred = predict_success_probability(candidate_analysis, job_post_dict)

        results.append({
            "job_id": job.get("job_id", ""),
            "role": job["job_title"],
            "company": job["company_name"],
            "location": job["location"],
            "experience_range": job["experience_range"],
            "type": emp_type,
            "match_percent": match_pct,
            "matched_skills": overlap[:4] if overlap else required[:4],
            "salary": job["salary_display"],
            "job_description": job.get("job_description", ""),
            "success_probability": pred["probability"],
            "success_rating": pred["rating"],
            "success_message": pred["message"]
        })

    # Sort matches by percentage in descending order
    results.sort(key=lambda x: x["match_percent"], reverse=True)
    return results
