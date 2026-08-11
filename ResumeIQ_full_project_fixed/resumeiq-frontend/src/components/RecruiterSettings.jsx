import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./RecruiterDashboard.css";
import "./RecruiterSettings.css";

export default function RecruiterSettings() {
  const navigate = useNavigate();

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [latestCompany, setLatestCompany] = useState("");
  const [emailSettings, setEmailSettings] = useState({ sender_email: "", app_password: "" });

  const [companyNameInput, setCompanyNameInput] = useState("");
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [appPasswordInput, setAppPasswordInput] = useState("");

  const [companyUpdating, setCompanyUpdating] = useState(false);
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // Fetch settings data on load
  const fetchSettingsData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/recruiter/api/settings/");
      if (res.data) {
        setJobs(res.data.jobs || []);
        setLatestCompany(res.data.latest_company || "TechNova Solutions");
        setCompanyNameInput(res.data.latest_company || "");
        setEmailSettings(res.data.email_settings || {});
        setSenderEmailInput(res.data.email_settings?.sender_email || "");
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        navigate("/login");
      } else {
        setError("Failed to load settings details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setCompanyUpdating(true);
    try {
      const fd = new FormData();
      fd.append("company_name", companyNameInput);
      const res = await api.post("/recruiter/api/settings/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.success) {
        setLatestCompany(companyNameInput);
        alert("Company profile updated successfully!");
      } else {
        alert(res.data.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating company profile.");
    } finally {
      setCompanyUpdating(false);
    }
  };

  const handleUpdateEmailSettings = async (e) => {
    e.preventDefault();
    setEmailUpdating(true);
    setEmailError("");
    setEmailSuccess("");

    if (!senderEmailInput) {
      setEmailError("Gmail address is required.");
      setEmailUpdating(false);
      return;
    }
    if (!appPasswordInput && !emailSettings.sender_email) {
      setEmailError("App Password is required.");
      setEmailUpdating(false);
      return;
    }

    try {
      const fd = new FormData();
      fd.append("sender_email", senderEmailInput);
      fd.append("app_password", appPasswordInput);

      const res = await api.post("/recruiter/api/settings/email/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.success) {
        setEmailSettings(prev => ({ ...prev, sender_email: senderEmailInput }));
        setAppPasswordInput("");
        setEmailSuccess("Email settings saved successfully!");
      } else {
        setEmailError(res.data.error || "Failed to save email settings.");
      }
    } catch (err) {
      console.error(err);
      setEmailError("Network error. Please try again.");
    } finally {
      setEmailUpdating(false);
    }
  };

  const handleDeleteJob = async (e, jobId, jobTitle) => {
    e.preventDefault();
    if (window.confirm(`Are you sure you want to delete the job posting for "${jobTitle}"? This action cannot be undone.`)) {
      try {
        const res = await api.post(`/recruiter/api/job/delete/${jobId}/`);
        if (res.data && res.data.success) {
          setJobs(prev => prev.filter(j => j.id_str !== jobId));
        } else {
          alert(res.data.error || "Failed to delete job.");
        }
      } catch (err) {
        console.error(err);
        alert("Error deleting job.");
      }
    }
  };

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/logout/");
      window.location.href = res.data.redirect_url || "/login";
    } catch (err) {
      console.error(err);
      window.location.href = "/login";
    }
  };

  const getJobIconStyle = (iconName) => {
    switch (iconName) {
      case "code":
        return { backgroundColor: "#f5f3ff", color: "#7c3aed" };
      case "backend":
        return { backgroundColor: "#ecfeff", color: "#0e7490" };
      case "ui":
        return { backgroundColor: "#eff6ff", color: "#2563eb" };
      case "database":
        return { backgroundColor: "#f0fdf4", color: "#16a34a" };
      case "marketing":
        return { backgroundColor: "#fff7ed", color: "#ea580c" };
      default:
        return { backgroundColor: "#f1f5f9", color: "#64748b" };
    }
  };

  if (loading) {
    return (
      <div className="recruiter-settings-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2 style={{ color: "#00d2ff" }}>Loading settings...</h2>
      </div>
    );
  }

  return (
    <div className="recruiter-settings-root recruiter-dashboard-root">
      <div className="dashboard-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="logo-icon">
              <i className="bx bx-brain"></i>
            </div>
            <div>
              <h2>
                Resume<span>IQ</span>
              </h2>
              <p className="role-text">Recruiter</p>
            </div>
          </div>

          <nav className="sidebar-menu">
            <ul>
              <li>
                <Link to="/recruiter/dashboard">
                  <i className="bx bxs-home-smile"></i> Overview
                </Link>
              </li>
              <li>
                <Link to="/recruiter/job/create">
                  <i className="bx bx-briefcase-alt-2"></i> Job Posts
                </Link>
              </li>
              <li>
                <Link to="/recruiter/dashboard#applications">
                  <i className="bx bx-folder-open"></i> Applications
                </Link>
              </li>
              <li className="active">
                <Link to="/recruiter/settings">
                  <i className="bx bx-cog"></i> Settings
                </Link>
              </li>
            </ul>
          </nav>

          <Link to="/recruiter/job/create" className="btn-create-nav" style={{ textDecoration: "none" }}>
            <i className="bx bx-plus"></i> Create Job Post
          </Link>

          <div className="sidebar-footer">
            <a href="#logout" onClick={handleLogout} className="logout-link">
              <i className="bx bx-log-out"></i> Logout
            </a>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="main-content">
          <header className="main-header">
            <div className="welcome-text">
              <h1>Recruiter Settings ⚙️</h1>
              <p>Configure settings and manage your active job listings.</p>
            </div>
            <div className="header-actions">
              <div className="company-dropdown">
                <i className="bx bx-building company-icon"></i>
                <span className="company-name">{latestCompany}</span>
                <i className="bx bx-chevron-down arrow-icon"></i>
              </div>
            </div>
          </header>

          {/* Company Profile Card */}
          <div className="company-profile-card">
            <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>
              <i className="bx bx-building-house"></i> Company Profile
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              Manage your registered company identity. This name is pre-filled and locked on your job post creation page. Editing it here will instantly update all your active job postings.
            </p>
            <form onSubmit={handleUpdateCompany}>
              <div className="profile-form-group">
                <label htmlFor="company_name">Company Name</label>
                <div className="profile-input-wrapper">
                  <i className="bx bx-buildings"></i>
                  <input
                    type="text"
                    id="company_name"
                    value={companyNameInput}
                    onChange={(e) => setCompanyNameInput(e.target.value)}
                    placeholder="Enter company name"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-profile-save" disabled={companyUpdating}>
                <i className="bx bx-check-shield"></i> {companyUpdating ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </div>

          {/* Email Settings Card */}
          <div className="company-profile-card">
            <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>
              <i className="bx bx-envelope"></i> Email Settings
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              Connect the Gmail mailbox you want candidate emails to be sent from (the "Email" button on Applications → View Details). Use an{" "}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-cyan)" }}>
                App Password
              </a>
              , not your regular Gmail password. Your password is stored so the app can send on your behalf — never share this login with anyone else.
            </p>

            {emailError && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>{emailError}</p>}
            {emailSuccess && <p style={{ color: "#4ade80", fontSize: "0.85rem", marginBottom: "1rem" }}><i className="bx bx-check-circle"></i> {emailSuccess}</p>}
            {emailSettings.sender_email && !emailSuccess && (
              <p style={{ color: "#4ade80", fontSize: "0.85rem", marginBottom: "1rem" }}>
                <i className="bx bx-check-circle"></i> Connected as {emailSettings.sender_email}
              </p>
            )}

            <form onSubmit={handleUpdateEmailSettings}>
              <div className="profile-form-group">
                <label htmlFor="sender_email">Gmail Address</label>
                <div className="profile-input-wrapper">
                  <i className="bx bx-at"></i>
                  <input
                    type="email"
                    id="sender_email"
                    value={senderEmailInput}
                    onChange={(e) => setSenderEmailInput(e.target.value)}
                    placeholder="you@gmail.com"
                    required
                  />
                </div>
              </div>
              <div className="profile-form-group">
                <label htmlFor="app_password">
                  App Password {emailSettings.sender_email && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(leave blank to keep current)</span>}
                </label>
                <div className="profile-input-wrapper">
                  <i className="bx bx-lock-alt"></i>
                  <input
                    type="password"
                    id="app_password"
                    value={appPasswordInput}
                    onChange={(e) => setAppPasswordInput(e.target.value)}
                    placeholder={emailSettings.sender_email ? "••••••••••••••••" : "16-character app password"}
                    required={!emailSettings.sender_email}
                  />
                </div>
              </div>
              <button type="submit" className="btn-profile-save" disabled={emailUpdating}>
                <i className="bx bx-check-shield"></i> {emailUpdating ? "Saving..." : "Save Email Settings"}
              </button>
            </form>
          </div>

          {/* Manage Job Posts */}
          <div className="settings-header">
            <h3 className="section-title">
              <i className="bx bx-list-ul"></i> Manage Job Posts
            </h3>
          </div>

          {jobs.length > 0 ? (
            <div className="settings-grid-layout">
              {jobs.map((job) => (
                <div className="job-manage-card" key={job.id_str}>
                  <div className="job-info-header" style={{ display: "flex", gap: "0.85rem", alignItems: "flex-start" }}>
                    <div
                      className="job-icon-box"
                      style={{
                        ...getJobIconStyle(job.job_icon),
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: "1.25rem",
                      }}
                    >
                      {job.job_icon === "code" && <i className="bx bx-code-alt"></i>}
                      {job.job_icon === "backend" && <i className="bx bx-server"></i>}
                      {job.job_icon === "ui" && "UI"}
                      {job.job_icon === "database" && <i className="bx bx-data"></i>}
                      {job.job_icon === "marketing" && <i className="bx bxs-megaphone"></i>}
                      {job.job_icon !== "code" && job.job_icon !== "backend" && job.job_icon !== "ui" && job.job_icon !== "database" && job.job_icon !== "marketing" && (
                        <i className="bx bx-briefcase"></i>
                      )}
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <h3 style={{ marginTop: 0, marginBottom: "0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-white)" }}>{job.job_title}</h3>
                      <div className="job-company" style={{ fontSize: "0.9rem" }}>
                        <i className="bx bx-buildings"></i> {job.company_name}
                      </div>

                      <div className="job-details-meta" style={{ marginBottom: 0, marginTop: "0.85rem" }}>
                        <span className="job-meta-item">
                          <i className="bx bx-briefcase"></i> {job.experience_range}
                        </span>
                        <span className="job-meta-item">
                          <i className="bx bx-time"></i> {job.get_employment_type_display}
                        </span>
                        {job.location && (
                          <span className="job-meta-item">
                            <i className="bx bx-map"></i> {job.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="job-actions-row">
                    <Link to={`/recruiter/job/edit/${job.id_str}`} className="btn-action-edit">
                      <i className="bx bx-edit-alt"></i> Edit
                    </Link>
                    <button onClick={(e) => handleDeleteJob(e, job.id_str, job.job_title)} className="btn-action-delete">
                      <i className="bx bx-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <section className="empty-state-section">
              <div className="empty-state-content">
                <div className="illustration-container">
                  <div className="glow-effect"></div>
                  <div className="graphic-wrapper">
                    <i className="bx bx-briefcase briefcase-icon" style={{ fontSize: "4.5rem", color: "var(--accent-cyan)", position: "static" }}></i>
                  </div>
                </div>
                <h2>No Active Job Posts</h2>
                <p>You have not posted any jobs yet. Create a job posting to view it here.</p>
                <Link to="/recruiter/job/create" className="btn-primary-action cyan-gradient-cta" style={{ color: "#030508" }}>
                  + Post a Job
                </Link>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
