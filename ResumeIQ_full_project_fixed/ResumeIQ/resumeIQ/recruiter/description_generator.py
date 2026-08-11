import os

def generate_job_description(job_title: str, required_skills: str) -> str:
    """
    Generates a professional job description using Langchain (Gemini/OpenAI) or local fallback.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")

    use_real_llm = bool(openai_key or gemini_key)
    llm_type = "OpenAI" if openai_key else "Gemini"

    if use_real_llm:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            
            prompt = ChatPromptTemplate.from_template("""
You are an expert tech recruiter. Write a complete, professional, and highly detailed job description based on the following job title and required skills.

Job Title: {job_title}
Required Skills: {required_skills}

Format the description nicely in Markdown (with headings and bullet points) and include the following sections:
1. About the Role
2. Key Responsibilities
3. Requirements (Technical & Professional)
4. What We Offer

Job Description:
""")
            
            if openai_key:
                from langchain_openai import ChatOpenAI
                llm = ChatOpenAI(openai_api_key=openai_key, model="gpt-4o-mini", temperature=0.7)
            else:
                from langchain_google_genai import ChatGoogleGenerativeAI
                llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=gemini_key, temperature=0.7)

            chain = prompt | llm
            response = chain.invoke({
                "job_title": job_title,
                "required_skills": required_skills
            })
            
            desc_text = response.content if hasattr(response, 'content') else str(response)
            return desc_text.strip()
            
        except Exception as e:
            print(f"Langchain Job Generator failed, using fallback. Error: {e}")

    # ── SIMULATED GENERATOR FALLBACK ───────────────────────────────
    # Generates a premium simulated response to mimic Langchain's output
    skills_list = [s.strip() for s in required_skills.split(",") if s.strip()]
    skills_bullet = "\n".join([f"* Proficiency in **{s}**" for s in skills_list]) if skills_list else "* General software engineering capabilities"

    simulated_description = f"""### About the Role
We are seeking a talented and motivated **{job_title}** to join our fast-growing engineering team. In this role, you will be responsible for designing, building, and maintaining robust applications, collaborating closely with cross-functional teams to deliver high-quality features that solve real-world problems.

### Key Responsibilities
* Collaborate with designers and product managers to define scope and implement high-performance features.
* Write clean, maintainable, and well-tested code following industry best practices.
* Participate in code reviews, technical discussions, and contribute to system architecture designs.
* Troubleshoot, debug, and optimize applications for maximum speed and scalability.

### Requirements (Technical & Professional)
{skills_bullet}
* Strong problem-solving abilities and attention to detail.
* Excellent communication and teamwork skills.
* Experience with version control systems (Git) and collaborative development workflows.

### What We Offer
* Competitive salary and benefits package.
* Flexible working hours and remote-friendly options.
* Career growth path with mentoring and training support.
* A collaborative and inclusive engineering culture.
"""
    return simulated_description.strip()
