import re
import numpy as np
from sklearn.linear_model import LogisticRegression

# Synthetic dataset of historical hiring/interview callback data
# Features: [experience_difference, skill_overlap_ratio, profile_ats_score]
# Labels: 1 (Interview callback), 0 (No interview callback)
TRAINING_X = np.array([
    [2.0, 0.85, 88],   # Exceeds experience, high skill match, high ATS score -> Callback
    [0.0, 0.70, 75],   # Meets experience, decent skill match, good ATS score -> Callback
    [-3.0, 0.20, 45],  # Lacks experience, low skill match, low ATS score -> No callback
    [4.0, 0.60, 80],   # Far exceeds experience, medium skill match, good ATS score -> Callback
    [-1.0, 0.90, 78],  # Lacks 1 yr experience, high skill match, good ATS -> Callback
    [1.0, 0.10, 50],   # Exceeds experience slightly, very low skill match, poor ATS -> No callback
    [-2.0, 0.40, 60],  # Lacks 2 yrs experience, medium skill match, average ATS -> No callback
    [5.0, 0.30, 65],   # Far exceeds experience, low skill match, average ATS -> No callback
    [0.0, 0.50, 70],   # Meets experience, medium skill match, average ATS -> Callback
    [-4.0, 0.80, 72],  # Lacks 4 yrs experience, high skill match, good ATS -> No callback (too junior)
])
TRAINING_Y = np.array([1, 1, 0, 1, 1, 0, 0, 0, 1, 0])

# Initialize and train the classifier (takes < 1ms)
classifier = LogisticRegression(random_state=42)
classifier.fit(TRAINING_X, TRAINING_Y)


def predict_success_probability(candidate_ats_analysis: dict, job_post: dict) -> dict:
    """
    Predicts the probability of the candidate getting an interview callback using a Logistic Regression model.
    Features:
      1. Experience difference (Candidate Exp - Job Required Exp)
      2. Skills overlap ratio (Candidate matched skills / Job required skills)
      3. Global candidate ATS score
    """
    if not candidate_ats_analysis:
        return {
            "probability": 0,
            "rating": "No Resume Analyzed",
            "message": "Upload your resume in the Analyzer tab to compute your interview call success probability."
        }

    # 1. Experience Difference Feature
    candidate_exp_str = candidate_ats_analysis.get("resume_summary", {}).get("experience", "0 Years")
    try:
        candidate_exp = float(candidate_exp_str.split()[0])
    except Exception:
        candidate_exp = 0.0

    # Extract job required experience range (format "min-max Years" or "min-max Yrs")
    job_exp_str = job_post.get("experience_range") or job_post.get("experience") or "0-2 Years"
    try:
        # Search for first number in e.g. "3-5 Years"
        match = re.search(r'(\d+)', job_exp_str)
        job_min_exp = float(match.group(1)) if match else 0.0
    except Exception:
        job_min_exp = 0.0

    experience_diff = candidate_exp - job_min_exp

    # 2. Skill Overlap Ratio Feature
    # Job required skills
    job_skills_raw = job_post.get("required_skills") or job_post.get("requirements") or ""
    if isinstance(job_skills_raw, list):
        job_skills = [s.strip().lower() for s in job_skills_raw if s.strip()]
    elif isinstance(job_skills_raw, str):
        job_skills = [s.strip().lower() for s in job_skills_raw.split(",") if s.strip()]
    else:
        job_skills = []
    
    # Candidate matched/declared skills
    candidate_skills = [s.strip().lower() for s in candidate_ats_analysis.get("matched_keywords", [])]
    
    if job_skills:
        overlap_count = sum(1 for s in job_skills if s in candidate_skills)
        skill_overlap_ratio = overlap_count / len(job_skills)
    else:
        # Fallback if job details specify no skills (default base overlap)
        skill_overlap_ratio = 0.5

    # 3. Profile Score Feature
    candidate_score = float(candidate_ats_analysis.get("ats_score", 50))

    # Features array for scikit-learn model input
    features = np.array([[experience_diff, skill_overlap_ratio, candidate_score]])

    # Run prediction
    try:
        probabilities = classifier.predict_proba(features)[0]
        probability = float(probabilities[1]) # probability of class 1 (callback)
    except Exception:
        probability = 0.5

    probability_pct = round(probability * 100)

    # Assign ratings based on probability percentage
    if probability_pct >= 75:
        rating = "High"
        message = "Excellent fit! Your profile matches or exceeds both experience and skill requirements."
    elif probability_pct >= 45:
        rating = "Medium"
        message = "Good alignment. You meet major criteria, but adding a few key skills will improve your chances."
    else:
        rating = "Low"
        message = "Lower callback probability. Consider matching job keywords or gaining more experience."

    return {
        "probability": probability_pct,
        "rating": rating,
        "message": message
    }
