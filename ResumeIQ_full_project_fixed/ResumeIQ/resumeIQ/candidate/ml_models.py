import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from .views import (
    extract_name, extract_email, extract_phone, extract_experience_level,
    extract_skills_section, _get_job_recommendations, SKILL_DEFINITIONS, _skill_present
)

# ── TRAINING DATA FOR RESUME CLASSIFICATION ───────────────────────
# We train a Logistic Regression classifier on typical resumes for five major developer roles.
TRAINING_DATA = [
    # Frontend Developer
    ("Frontend Web Developer skilled in React.js, HTML5, CSS3, JavaScript, Tailwind CSS, Responsive Web Design, and Single Page Applications. Built modern user interfaces and optimized web app performance.", "Frontend Developer"),
    ("Senior Frontend Engineer with expertise in Angular, React, TypeScript, and state management. Strong focus on UI/UX, cross-browser compatibility, and CSS architectures.", "Frontend Developer"),
    ("Junior Web Developer with a strong passion for frontend development, HTML, CSS, JavaScript, jQuery, and Vue.js. Experience building responsive layouts.", "Frontend Developer"),
    
    # Backend Developer
    ("Backend Software Engineer specializing in Python, Django, REST APIs, PostgreSQL, MongoDB, and Redis. Developed secure and scalable backend microservices and databases.", "Backend Developer"),
    ("Node.js Backend Developer with expertise in Express.js, TypeScript, SQL, databases, API design, and system architecture. Built scalable real-time servers.", "Backend Developer"),
    ("Java Software Developer with strong backend experience using Spring Boot, Hibernate, MySQL, and microservices architecture. Skilled in OOP and database design.", "Backend Developer"),
    
    # DevOps Engineer
    ("DevOps Engineer focused on automation, infrastructure as code, CI/CD pipelines, Docker, Kubernetes, and cloud platforms like AWS (EC2, S3, RDS).", "DevOps Engineer"),
    ("Cloud Infrastructure Engineer with experience in Terraform, CI/CD tools (Jenkins, GitHub Actions), AWS, Azure, Linux administration, and Kubernetes containerization.", "DevOps Engineer"),
    ("Site Reliability Engineer (SRE) specializing in Linux shell scripting, Kubernetes, system monitoring (Prometheus, Grafana), Docker, and AWS cloud management.", "DevOps Engineer"),
    
    # Data Scientist / ML Engineer
    ("Data Scientist with expertise in Python, Machine Learning algorithms, Scikit-learn, Pandas, NumPy, Deep Learning (TensorFlow, PyTorch), and SQL database query optimization.", "Data Scientist"),
    ("Machine Learning Engineer building neural networks, PyTorch models, NLP text processing, computer vision, data analysis, and predictive modeling using Python.", "Data Scientist"),
    ("Data Analyst and Scientist skilled in statistical analysis, data visualization with Tableau, Pandas, NumPy, SQL, regression models, and exploratory data analysis.", "Data Scientist"),

    # Fullstack Developer
    ("Fullstack Developer with experience in React, Node.js, Express, MongoDB, and SQL. Capable of building both responsive user interfaces and backend API endpoints.", "Fullstack Developer"),
    ("MERN Stack Developer skilled in MongoDB, Express, React, Node.js, JavaScript, git, and RESTful API integrations. Deployed full-stack web applications.", "Fullstack Developer"),
    ("Senior Software Engineer with fullstack expertise in Python, Django, React, Postgres, and cloud deployments. Strong problem solver in frontend and backend technologies.", "Fullstack Developer"),
]

# Extract texts and labels
texts = [x[0] for x in TRAINING_DATA]
labels = [x[1] for x in TRAINING_DATA]

# Initialize and train TfidfVectorizer & LogisticRegression
vectorizer = TfidfVectorizer(stop_words='english', lowercase=True)
X_train = vectorizer.fit_transform(texts)
classifier = LogisticRegression(random_state=42)
classifier.fit(X_train, labels)


def run_ml_analysis(resume_text: str, default_name: str = "User") -> dict:
    """
    Analyzes the resume text using a trained Logistic Regression model.
    Classifies the resume into one of the 5 developer classes and outputs
    aligned scores, strengths, and suggestions.
    """
    resume_clean = resume_text.lower().strip()
    word_count = len(resume_clean.split())

    # 1. Logistic Regression Prediction
    X_test = vectorizer.transform([resume_clean])
    predicted_role = classifier.predict(X_test)[0]
    probabilities = classifier.predict_proba(X_test)[0]
    classes = list(classifier.classes_)
    role_idx = classes.index(predicted_role)
    confidence = float(probabilities[role_idx])
    confidence_pct = round(confidence * 100)

    # 2. Extract Candidate Info (Name, Email, Phone, Exp)
    extracted_name = extract_name(resume_text, default_name=default_name)
    extracted_email = extract_email(resume_text)
    extracted_phone = extract_phone(resume_text)
    extracted_experience = extract_experience_level(resume_text)

    # 3. Match predefined skills
    matched_skills = []
    missing_skills = []
    for label, patterns in SKILL_DEFINITIONS:
        if _skill_present(patterns, resume_text):
            matched_skills.append(label)
        else:
            missing_skills.append(label)

    # Filter top missing skills to match predicted role
    role_matching_priority = {
        "Frontend Developer": ["React", "HTML", "CSS", "JavaScript", "TypeScript", "Tailwind CSS"],
        "Backend Developer": ["Python", "Django", "Node.js", "SQL", "PostgreSQL", "REST API"],
        "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Git"],
        "Data Scientist": ["Python", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas"],
        "Fullstack Developer": ["React", "Node.js", "MongoDB", "SQL", "Git", "REST API"]
    }
    priority_list = role_matching_priority.get(predicted_role, ["Python", "React", "Docker"])
    missing_keywords = [s for s in priority_list if s not in matched_skills]
    if not missing_keywords:
        # Fallback if they matched all priority ones
        missing_keywords = [s for s in missing_skills if s in priority_list][:4]
    if not missing_keywords:
        missing_keywords = missing_skills[:4]

    # 4. Score Calculation based on ML classification confidence & structural quality
    # Skills Match (40 pts max): Derived from how well they align with predicted role (confidence)
    skills_score = min(40, round(confidence * 40))
    
    # Keyword Match (20 pts max): Predefined skills matched
    keyword_score = min(20, len(matched_skills) * 1.5)
    
    # Content Quality (20 pts max): Word counts and metrics
    has_metrics = bool(re.search(
        r'\b\d+\s*%|\$\s*\d+|\b\d+\s*(years?|months?|projects?|teams?|people|users?|clients?)\b'
        r'|increased|decreased|reduced|improved|optimized|saved|grew',
        resume_clean
    ))
    quality_score = 5
    if word_count >= 300:
        quality_score += 5
    if word_count >= 500:
        quality_score += 3
    if has_metrics:
        quality_score += 7
    quality_score = min(20, quality_score)

    # Formatting (10 pts max): Structural indicators
    has_experience = bool(re.search(r'\b(experience|work|employment)\b', resume_clean))
    has_education = bool(re.search(r'\b(education|degree|university|college)\b', resume_clean))
    has_skills = bool(re.search(r'\b(skills|technologies|tools)\b', resume_clean))
    formatting_score = 4
    if extracted_email and extracted_phone:
        formatting_score += 2
    if has_education:
        formatting_score += 2
    if has_experience:
        formatting_score += 2
    formatting_score = min(10, formatting_score)

    # Experience Score (10 pts max)
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

    total_score = int(skills_score + keyword_score + quality_score + formatting_score + experience_score)
    total_score = max(5, min(100, total_score))

    # 5. Strengths & Areas to Improve Aligned with Predicted Role
    strengths = [
        f"Logistic Regression classified profile as a strong fit for a '{predicted_role}' ({confidence_pct}% confidence).",
        "Resume exhibits clear professional layout and organization."
    ]
    if has_metrics:
        strengths.append("Successfully quantified professional achievements with metrics.")
    if len(matched_skills) >= 8:
        strengths.append("Demonstrates a solid command of standard tech stack keywords.")

    areas_to_improve = []
    if confidence < 0.65:
        areas_to_improve.append(f"Strengthen alignment with target role '{predicted_role}' by highlighting relevant projects.")
    if len(matched_skills) < 10:
        areas_to_improve.append("Add more technical keywords to improve model classification confidence.")
    if not has_metrics:
        areas_to_improve.append("Incorporate quantitative outcomes (percentages, numbers) into work experience.")

    ai_suggestions = [
        f"Optimize resume specifically for '{predicted_role}' roles.",
        f"Your model matching confidence is {confidence_pct}%. Adding keywords like {', '.join(missing_keywords[:3])} will boost alignment."
    ]
    if word_count < 300:
        ai_suggestions.append("Expand on details of key projects to increase document content quality.")

    # Formatting issues
    formatting_issues = []
    if not extracted_email or not extracted_phone:
        formatting_issues.append({
            "type": "danger",
            "title": "Missing Contact Info",
            "desc": "Make sure your email and phone number are clearly visible.",
            "field": "bEmail"
        })
    if not has_skills:
        formatting_issues.append({
            "type": "danger",
            "title": "Skills Section Missing",
            "desc": "Add a dedicated Skills section to help ML models extract capabilities.",
            "field": "bSkills"
        })
    if not formatting_issues:
        formatting_issues.append({
            "type": "positive",
            "title": "Structural Alignment ✓",
            "desc": "Required document structural components are present.",
            "field": None
        })

    # Job Recommendations (using Scikit-Learn TF-IDF similarity in views)
    all_resume_skills = list(matched_skills)
    resume_declared_skills = extract_skills_section(resume_text)
    for s in resume_declared_skills:
        if s not in all_resume_skills:
            all_resume_skills.append(s)
            
    # nlp processed text for tf-idf recommendations
    nlp_text = resume_clean + " " + " ".join(all_resume_skills)
    job_recommendations = _get_job_recommendations(nlp_text, all_resume_skills)

    skills_preview = f"({predicted_role} - {confidence_pct}% Match) | " + ", ".join(all_resume_skills[:6])

    return {
        "ats_score": total_score,
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
        "missing_keywords": missing_keywords,
        "ai_suggestions": ai_suggestions,
        "job_recommendations": job_recommendations,
        "formatting_issues": formatting_issues,
        "keyword_match_percent": int(confidence_pct),
        "matched_keywords": all_resume_skills[:12],
        "word_count": word_count,
        "model_used": "Logistic Regression ML"
    }
