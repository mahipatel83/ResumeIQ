import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "./CreateJob.css";

export default function CreateJob() {
  const navigate = useNavigate();
  const { jobId } = useParams(); // present if in edit mode
  const isEdit = !!jobId;

  // Form fields state
  const [companyName, setCompanyName] = useState("");
  const [lockedCompanyName, setLockedCompanyName] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobIcon, setJobIcon] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [expMin, setExpMin] = useState("");
  const [expMax, setExpMax] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryHidden, setSalaryHidden] = useState(false);
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [generatingDescription, setGeneratingDescription] = useState(false);

  const [hasDraft, setHasDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Fetch job details (in edit mode) or default settings (for draft/locked company name)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (isEdit) {
          const res = await api.get(`/recruiter/api/job/details/${jobId}/`);
          if (res.data && res.data.success) {
            const job = res.data.job;
            setJobTitle(job.job_title || "");
            setJobIcon(job.job_icon || "");
            setEmploymentType(job.employment_type || "");
            setExperienceLevel(job.experience_level || "");
            setRequiredSkills(job.required_skills || "");
            setJobDescription(job.job_description || "");
            setSalaryMin(job.salary_min || "");
            setSalaryMax(job.salary_max || "");
            setSalaryHidden(!!job.salary_hidden);
            setLocation(job.location || "");
            setIsRemote(!!job.is_remote);
            setCompanyName(job.company_name || "");
            setLockedCompanyName(res.data.locked_company_name);
            // Parse experience range
            if (res.data.exp_min) setExpMin(res.data.exp_min);
            if (res.data.exp_max) setExpMax(res.data.exp_max);
          }
        } else {
          // Fetch draft or user profile config
          const res = await api.get("/recruiter/api/job/create/");
          if (res.data) {
            setLockedCompanyName(res.data.locked_company_name);
            if (res.data.locked_company_name) {
              setCompanyName(res.data.locked_company_name);
            }
            if (res.data.has_draft && res.data.job) {
              const draft = res.data.job;
              setHasDraft(true);
              setJobTitle(draft.job_title || "");
              setJobIcon(draft.job_icon || "");
              setEmploymentType(draft.employment_type || "");
              setExperienceLevel(draft.experience_level || "");
              setExpMin(draft.exp_min || "");
              setExpMax(draft.exp_max || "");
              setRequiredSkills(draft.required_skills || "");
              setJobDescription(draft.job_description || "");
              setSalaryMin(draft.salary_min || "");
              setSalaryMax(draft.salary_max || "");
              setSalaryHidden(!!draft.salary_hidden);
              setLocation(draft.location || "");
              setIsRemote(!!draft.is_remote);
              if (!res.data.locked_company_name) {
                setCompanyName(draft.company_name || "");
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
        if (err.response && err.response.status === 401) {
          navigate("/login");
        } else {
          setError("Failed to load details. Please refresh the page.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId, isEdit]);

  // Step progress trackers
  const isStep1Active = companyName.trim().length > 0;
  const isStep2Active = expMin.toString().trim().length > 0 && expMax.toString().trim().length > 0;
  const isStep3Active = location.trim().length > 0;

  const handleGenerateDescription = async () => {
    if (!jobTitle) {
      alert("Please enter a Job Title first.");
      return;
    }
    setGeneratingDescription(true);
    const gfd = new FormData();
    gfd.append("job_title", jobTitle);
    gfd.append("required_skills", requiredSkills);
    try {
      const res = await api.post("/recruiter/api/job/generate-description/", gfd);
      if (res.data && res.data.success) {
        setJobDescription(res.data.description);
      } else {
        alert(res.data.error || "Failed to generate job description.");
      }
    } catch (err) {
      alert("Error generating description. Please try again.");
    } finally {
      setGeneratingDescription(false);
    }
  };

  const handleSubmit = async (e, formAction = "publish") => {
    if (e) e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("form_action", formAction);
    fd.append("company_name", companyName);
    fd.append("job_title", jobTitle);
    fd.append("job_icon", jobIcon);
    fd.append("employment_type", employmentType);
    fd.append("experience_level", experienceLevel);
    fd.append("exp_min", expMin);
    fd.append("exp_max", expMax);
    fd.append("location", location);
    fd.append("is_remote", isRemote ? "on" : "off");
    fd.append("salary_min", salaryMin);
    fd.append("salary_max", salaryMax);
    fd.append("salary_hidden", salaryHidden ? "on" : "off");
    fd.append("required_skills", requiredSkills);
    fd.append("job_description", jobDescription);

    try {
      let url = "/recruiter/api/job/create/";
      if (isEdit) {
        url = `/recruiter/api/job/edit/${jobId}/`;
      }
      const res = await api.post(url, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.success) {
        if (formAction === "draft") {
          setHasDraft(true);
          alert("Draft saved successfully!");
        } else {
          navigate("/recruiter/dashboard");
        }
      } else {
        setError(res.data.error || "An error occurred while saving the job post.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="create-job-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2 style={{ color: "#00d2ff" }}>Loading Job Form...</h2>
      </div>
    );
  }

  return (
    <div className="create-job-root">
      <div className="form-page-container">
        <header className="form-header">
          <div className="header-left">
            <Link to="/recruiter/dashboard" className="back-arrow-btn">
              <i className="bx bx-left-arrow-alt"></i>
            </Link>
            <div>
              <h1>{isEdit ? "Edit Job Post" : "Create Job Post"}</h1>
              <p>{isEdit ? "Modify the details of your job post." : "Fill in the details to post a job and find the right talent."}</p>
            </div>
          </div>
          {!isEdit && (
            <button type="button" onClick={() => handleSubmit(null, "draft")} className="btn-save-draft" disabled={submitting}>
              <i className="bx bx-bookmark"></i> Save as Draft
            </button>
          )}
        </header>

        {hasDraft && !isEdit && (
          <div style={{ background: "rgba(0, 210, 255, 0.08)", border: "1px solid rgba(0, 210, 255, 0.25)", color: "var(--accent-cyan)", borderRadius: "10px", padding: "0.85rem 1.1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 600 }}>
            <i className="bx bx-info-circle"></i> Continuing your saved draft — pick up right where you left off.
          </div>
        )}

        <div className="step-tracker-bar">
          <div className={`tracker-step ${isStep1Active ? "active" : ""}`} id="step-node-1">
            <span className="step-num">1</span>
            <span className="step-label">Company Name</span>
          </div>
          <div className={`tracker-line ${isStep1Active && isStep2Active ? "active" : ""}`} id="step-line-1"></div>
          <div className={`tracker-step ${isStep2Active ? "active" : ""}`} id="step-node-2">
            <span className="step-num">2</span>
            <span className="step-label">Experience</span>
          </div>
          <div className={`tracker-line ${isStep2Active && isStep3Active ? "active" : ""}`} id="step-line-2"></div>
          <div className={`tracker-step ${isStep3Active ? "active" : ""}`} id="step-node-3">
            <span className="step-num">3</span>
            <span className="step-label">Location</span>
          </div>
        </div>

        {error && (
          <div style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, "publish")} id="job-post-form">
          <div className="form-section-card">
            <div className="section-card-header">
              <div className="section-icon-box">
                <i className="bx bx-building"></i>
              </div>
              <div>
                <h3>Company Identity</h3>
                <p>Provide basic company name details.</p>
              </div>
            </div>

            <div className="form-row-grid">
              <div className="input-field-group">
                <label>
                  Company Name <span className="required-star">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <i className="bx bx-buildings"></i>
                  {lockedCompanyName ? (
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={lockedCompanyName}
                      readonly
                      style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.05)", color: "var(--text-muted)", cursor: "not-allowed" }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  )}
                </div>
                {lockedCompanyName && (
                  <small style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                    <i className="bx bx-info-circle"></i> Company name is locked. Modify it under <Link to="/recruiter/settings" style={{ color: "var(--accent-cyan)", textDecoration: "none", fontWeight: 600 }}>Settings</Link>.
                  </small>
                )}
              </div>
              <div className="input-field-group">
                <label>
                  Job Title <span className="required-star">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <i className="bx bx-briefcase"></i>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Developer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Job Icon Selector */}
            <div className="input-field-group" style={{ marginTop: "1.25rem" }}>
              <label>
                Job Display Icon <span className="required-star">*</span>
              </label>
              <div className="input-icon-wrapper">
                <i className="bx bx-shapes" style={{ color: "var(--accent-cyan)" }}></i>
                <select value={jobIcon} onChange={(e) => setJobIcon(e.target.value)} required>
                  <option value="" disabled>
                    Select display icon
                  </option>
                  <option value="code">💻 Code / Developer (&lt;/&gt; Icon)</option>
                  <option value="backend">🖥️ Backend Developer (Server Icon)</option>
                  <option value="ui">🎨 Design / UI-UX (UI Text Icon)</option>
                  <option value="database">🗄️ Backend / Database (Database Icon)</option>
                  <option value="marketing">📢 Marketing / Sales (Megaphone Icon)</option>
                  <option value="briefcase">💼 General Business (Briefcase Icon)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section-card">
            <div className="section-card-header">
              <div className="section-icon-box">
                <i className="bx bx-bar-chart-alt-2"></i>
              </div>
              <div>
                <h3>Experience Parameters</h3>
                <p>Define criteria metrics for prospects.</p>
              </div>
            </div>

            <div className="form-row-grid">
              <div className="input-field-group">
                <label>
                  Employment Type <span className="required-star">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <i className="bx bx-time-five"></i>
                  <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} required>
                    <option value="" disabled>
                      Select employment type
                    </option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
              </div>
              <div className="input-field-group">
                <label>
                  Experience Level <span className="required-star">*</span>
                </label>
                <div className="input-icon-wrapper">
                  <i className="bx bx-medal"></i>
                  <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} required>
                    <option value="" disabled>
                      Select experience level
                    </option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="input-field-group">
              <label>
                Experience (In Years) <span className="required-star">*</span>
              </label>
              <div className="experience-inputs-row">
                <input
                  type="number"
                  placeholder="Minimum experience"
                  value={expMin}
                  onChange={(e) => setExpMin(e.target.value)}
                  required
                />
                <span className="range-divider">-</span>
                <input
                  type="number"
                  placeholder="Maximum experience"
                  value={expMax}
                  onChange={(e) => setExpMax(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-field-group" style={{ marginTop: "1.25rem" }}>
              <label>Required Skills (comma-separated)</label>
              <div className="input-icon-wrapper">
                <i className="bx bx-code-alt"></i>
                <input
                  type="text"
                  placeholder="e.g. Python, Django, React, SQL"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                />
              </div>
              <small style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                List key technical skills candidates need for this job.
              </small>
            </div>

            <div className="input-field-group" style={{ marginTop: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ margin: 0, fontWeight: "600", color: "#f1f5f9" }}>Job Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={generatingDescription}
                  style={{
                    backgroundColor: "rgba(56, 189, 248, 0.1)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(56, 189, 248, 0.1)";
                  }}
                >
                  {generatingDescription ? "✨ Generating..." : "✨ AI Generate Description"}
                </button>
              </div>
              <textarea
                placeholder="Write a job description, or click the AI button to auto-generate a professional description..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(15, 23, 42, 0.5)",
                  color: "#cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: 1.5,
                  minHeight: "150px",
                  boxSizing: "border-box"
                }}
              />
            </div>
          </div>

          <div className="form-section-card">
            <div className="section-card-header">
              <div className="section-icon-box">
                <i className="bx bx-rupee"></i>
              </div>
              <div>
                <h3>Salary</h3>
                <p>Let candidates know the compensation range for this role.</p>
              </div>
            </div>

            <div className="form-row-grid">
              <div className="input-field-group">
                <label>Minimum Salary (₹ LPA)</label>
                <div className="input-icon-wrapper">
                  <i className="bx bx-rupee"></i>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 6"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-field-group">
                <label>Maximum Salary (₹ LPA)</label>
                <div className="input-icon-wrapper">
                  <i className="bx bx-rupee"></i>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 12"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="checkbox-wrapper-row">
              <input
                type="checkbox"
                id="salary-hidden-check"
                checked={salaryHidden}
                onChange={(e) => setSalaryHidden(e.target.checked)}
              />
              <label htmlFor="salary-hidden-check">Don't disclose salary (show "Competitive" instead)</label>
            </div>
          </div>

          <div className="form-section-card">
            <div className="section-card-header">
              <div className="section-icon-box">
                <i className="bx bx-map-pin"></i>
              </div>
              <div>
                <h3>Location Setup</h3>
                <p>Configure regional assignment configurations.</p>
              </div>
            </div>

            <div className="input-field-group">
              <label>
                Location <span className="required-star">*</span>
              </label>
              <div className="input-icon-wrapper">
                <i className="bx bx-map"></i>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, Karnataka or Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="checkbox-wrapper-row">
              <input
                type="checkbox"
                id="remote-check"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
              />
              <label htmlFor="remote-check">Remote job</label>
            </div>
          </div>

          <footer className="form-actions-footer">
            <Link to="/recruiter/dashboard" className="btn-secondary-cancel">
              Cancel
            </Link>
            <button type="submit" className="btn-primary-publish" disabled={submitting}>
              {isEdit ? "Save Changes" : "Upload Post"} <i className="bx bx-cloud-upload"></i>
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
