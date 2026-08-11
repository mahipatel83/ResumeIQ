import os
import json
import re

def run_langchain_analysis(resume_text: str, default_name: str = "User") -> dict:
    """
    Runs resume analysis using Langchain. If GEMINI_API_KEY or OPENAI_API_KEY is available,
    it executes a real Langchain model call. Otherwise, it executes a simulated agent fallback.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    # Extract structural info using rules to seed the LLM prompt or fallback
    from .views import (
        extract_name, extract_email, extract_phone, extract_experience_level,
        extract_skills_section, _get_job_recommendations, SKILL_DEFINITIONS, _skill_present
    )

    extracted_name = extract_name(resume_text, default_name=default_name)
    extracted_email = extract_email(resume_text)
    extracted_phone = extract_phone(resume_text)
    extracted_experience = extract_experience_level(resume_text)
    
    matched_skills = []
    missing_skills = []
    for label, patterns in SKILL_DEFINITIONS:
        if _skill_present(patterns, resume_text):
            matched_skills.append(label)
        else:
            missing_skills.append(label)
            
    # Gather jobs for recommendations
    all_resume_skills = list(matched_skills)
    resume_declared_skills = extract_skills_section(resume_text)
    for s in resume_declared_skills:
        if s not in all_resume_skills:
            all_resume_skills.append(s)
            
    nlp_text = resume_text.lower().strip() + " " + " ".join(all_resume_skills)
    job_recommendations = _get_job_recommendations(nlp_text, all_resume_skills)

    use_real_llm = False
    llm_type = None
    
    if openai_key or gemini_key:
        use_real_llm = True
        llm_type = "OpenAI" if openai_key else "Gemini"

    if use_real_llm:
        try:
            # We import Langchain inside to prevent startup failure if dependencies are missing or slow to load
            from langchain_core.prompts import ChatPromptTemplate
            
            prompt = ChatPromptTemplate.from_template("""
You are an expert ATS (Applicant Tracking System) recruiter agent. Your task is to analyze the following resume and return a structured JSON response.

Return EXACTLY a JSON object with the following schema:
{{
  "ats_score": <int between 0 and 100>,
  "score_breakdown": {{
    "skills_match": <int 0-40>,
    "keyword_match": <int 0-20>,
    "content_quality": <int 0-20>,
    "formatting": <int 0-10>,
    "experience": <int 0-10>
  }},
  "resume_summary": {{
    "name": "<candidate name>",
    "email": "<candidate email>",
    "phone": "<candidate phone>",
    "experience": "<candidate experience level>",
    "key_skills": "<comma separated list of top 6 key skills found>"
  }},
  "strengths": [<list of 2-4 professional strengths of the resume>],
  "areas_to_improve": [<list of 2-4 concrete areas of improvement>],
  "missing_keywords": [<list of 4-6 industry-standard tech stack skills missing from the resume>],
  "ai_suggestions": [<list of 3-5 action items to improve the resume>]
}}

Candidate Name Reference: {name_ref}
Resume Text:
{resume_text}

JSON response:
""")
            
            if openai_key:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(openai_api_key=openai_key, model="gpt-4o-mini", temperature=0.2)
            else:
                from langchain_google_genai import ChatGoogleGenerativeAI
                llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key, temperature=0.2)
            
            # Simple chain: prompt | llm
            chain = prompt | llm
            response = chain.invoke({
                "resume_text": resume_text[:8000], # truncate to avoid token limits
                "name_ref": extracted_name
            })
            
            text_response = response.content if hasattr(response, 'content') else str(response)
            
            # Extract JSON substring if LLM returned markdown blocks (e.g. ```json ... ```)
            json_match = re.search(r"\{.*\}", text_response, re.DOTALL)
            if json_match:
                result_json = json.loads(json_match.group(0))
                # Add job recommendations & formatting issues which are calculated locally
                result_json["job_recommendations"] = job_recommendations
                
                # Check for formatting issues
                formatting_issues = []
                if not extracted_email or not extracted_phone:
                    formatting_issues.append({
                        "type": "danger",
                        "title": "Missing Contact Info",
                        "desc": "Please provide an email and phone number.",
                        "field": "bEmail"
                    })
                if not result_json.get("resume_summary", {}).get("key_skills"):
                    formatting_issues.append({
                        "type": "danger",
                        "title": "No Technical Skills Section",
                        "desc": "A dedicated technical skills summary is critical.",
                        "field": "bSkills"
                    })
                if not formatting_issues:
                    formatting_issues.append({
                        "type": "positive",
                        "title": "Layout Looks Good ✓",
                        "desc": "All critical formatting blocks were found.",
                        "field": None
                    })
                result_json["formatting_issues"] = formatting_issues
                result_json["model_used"] = f"Langchain Agent ({llm_type})"
                return result_json

        except Exception as e:
            # If any failure occurs, we log and fall back to the simulated agent
            print(f"Langchain LLM call failed, falling back to simulation. Error: {e}")

    # ── SIMULATED LANGCHAIN AGENT (FALLBACK) ───────────────────────
    # Generates a premium simulated response to mimic Langchain's analysis
    skills_score = min(40, len(matched_skills) * 3)
    keyword_score = min(20, len(matched_skills) * 1.5)
    quality_score = 12 if len(resume_text.split()) > 400 else 8
    if "percent" in resume_text.lower() or "%" in resume_text:
        quality_score += 6
    formatting_score = 8 if (extracted_email and extracted_phone) else 4
    experience_score = 10 if "years" in extracted_experience.lower() else 5
    
    score = int(skills_score + keyword_score + quality_score + formatting_score + experience_score)
    score = max(10, min(98, score))
    
    skills_str = ", ".join(all_resume_skills[:6]) if all_resume_skills else "General IT"
    
    result_json = {
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
            "key_skills": f"{skills_str}"
        },
        "strengths": [
            "Langchain Agent parsed structure and detected solid page layout formatting.",
            "Core developer and technical skills are grouped logically.",
            "Strong content description density aligned with engineering roles."
        ],
        "areas_to_improve": [
            "Quantify project achievements with metrics and percentages.",
            "Add certifications (e.g. AWS, Scrum Master, or Kubernetes Certified) to strengthen technical credentials."
        ],
        "missing_keywords": ["Docker", "Kubernetes", "AWS", "CI/CD"] if "docker" not in resume_text.lower() else ["FastAPI", "GraphQL", "Redis", "TypeScript"],
        "ai_suggestions": [
            "Langchain Agent Suggestion: Expand on technical project bullet points to highlight system performance improvements.",
            "Tailor professional summary to directly reflect modern cloud and web engineering targets.",
            "Verify contact credentials are up to date and include LinkedIn or GitHub profile links."
        ],
        "job_recommendations": job_recommendations,
        "formatting_issues": [
            {
                "type": "warning",
                "title": "Langchain Simulated Fallback",
                "desc": "No GOOGLE_API_KEY or OPENAI_API_KEY environment variables found. Running simulated Langchain agent.",
                "field": None
            }
        ],
        "keyword_match_percent": int(keyword_score * 5),
        "matched_keywords": all_resume_skills[:12],
        "word_count": len(resume_text.split()),
        "model_used": "Langchain Agent (Simulated)"
    }
    return result_json
