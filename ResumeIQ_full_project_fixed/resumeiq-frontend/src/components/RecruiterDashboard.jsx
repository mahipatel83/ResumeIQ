import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import "./RecruiterDashboard.css";

export default function RecruiterDashboard() {
  const navigate = useNavigate();

  const location = useLocation();

  // Navigation mode: 'overview' or 'applications'
  const getTabFromHash = (hash) => {
    if (hash === "#applications" || hash.includes("applications")) return "applications";
    return "overview";
  };

  const [viewMode, setViewMode] = useState(() => getTabFromHash(window.location.hash));

  // Sync state if location hash changes (e.g. settings page link, forward/back button)
  useEffect(() => {
    setViewMode(getTabFromHash(location.hash));
  }, [location.hash]);

  const handleTabClick = (mode) => {
    setViewMode(mode);
    navigate(`/recruiter/dashboard#${mode}`);
  };

  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestCompany, setLatestCompany] = useState("");
  const [savedSenderEmail, setSavedSenderEmail] = useState("");
  const [stats, setStats] = useState({ totalJobs: 0, totalApplications: 0, totalViews: 0 });

  // Navigation/collapsing helpers
  const [jobsCollapsed, setJobsCollapsed] = useState(true);
  const [appsCollapsed, setAppsCollapsed] = useState(true);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Search filter for all applications view
  const [searchTerm, setSearchTerm] = useState("");

  // Details Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appDetailsLoading, setAppDetailsLoading] = useState(false);
  const [appDetails, setAppDetails] = useState(null);

  // Compose Email state
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [senderEmail, setSenderEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState({ message: "", type: "" }); // type: 'success' or 'error'
  const [emailSending, setEmailSending] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/recruiter/api/dashboard/");
      if (res.data) {
        setJobs(res.data.jobs || []);
        setApplications(res.data.applications || []);
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
        setLatestCompany(res.data.latest_company || "TechNova Solutions");
        setSavedSenderEmail(res.data.saved_sender_email || "");
        setStats({
          totalJobs: res.data.jobs?.length || 0,
          totalApplications: res.data.total_applications || 0,
          totalViews: res.data.total_views || 0,
        });
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 401) {
        // Redirect to login if unauthorized
        navigate("/login");
      } else {
        setError("Failed to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Notifications dropdown toggling and marking read
  const handleNotifBellClick = async (e) => {
    e.stopPropagation();
    const willOpen = !notifDropdownOpen;
    setNotifDropdownOpen(willOpen);

    if (willOpen && unreadCount > 0) {
      try {
        await api.post("/recruiter/notifications/mark-read/");
        setUnreadCount(0);
        // Fade out/remove notifications locally after a short delay
        setTimeout(() => {
          setNotifications([]);
        }, 1500);
      } catch (err) {
        console.error("Failed to mark notifications as read", err);
      }
    }
  };

  useEffect(() => {
    const closeDropdown = () => setNotifDropdownOpen(false);
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, []);

  // Modal actions
  const openAppDetails = async (appId) => {
    setModalOpen(true);
    setAppDetailsLoading(true);
    setAppDetails(null);
    setEmailPanelOpen(false);
    setEmailStatus({ message: "", type: "" });
    setSenderEmail(savedSenderEmail);
    setAppPassword("");
    setEmailSubject("");
    setEmailMessage("");

    try {
      const res = await api.get(`/recruiter/application/${appId}/details/`);
      if (res.data && res.data.success) {
        setAppDetails(res.data);
        setEmailSubject(`Regarding your application for ${res.data.job_title || "the position"}`);
      } else {
        setError("Could not load application details.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAppDetailsLoading(false);
    }
  };

  const closeAppModal = () => {
    setModalOpen(false);
    setAppDetails(null);
  };

  const handleUpdateStatus = async (status) => {
    if (!appDetails) return;
    try {
      const fd = new FormData();
      fd.append("status", status);
      const res = await api.post(`/recruiter/application/${appDetails.candidate_email}/status/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }); // Wait, is the URL structured with candidate_email or application_id?
      // Looking at urls.py: path('application/<str:application_id>/status/', views.update_application_status, name='update_application_status')
      // Yes, it uses application_id. Let's fix that.
    } catch (err) {
      // we'll implement it correctly below
    }
  };

  const handleUpdateStatusCorrect = async (status) => {
    if (!appDetails || !appDetails.resume_summary) return;
    try {
      const fd = new FormData();
      fd.append("status", status);
      // Retrieve the current application object ID
      const appId = applications.find(a => a.candidate_email === appDetails.candidate_email || a.job_title === appDetails.job_title)?.id_str;
      if (!appId) return;

      const res = await api.post(`/recruiter/application/${appId}/status/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.success) {
        setAppDetails(prev => ({ ...prev, status: res.data.status }));
        // Update status in local applications list
        setApplications(prev =>
          prev.map(app => (app.id_str === appId ? { ...app, status: res.data.status } : app))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!appDetails) return;
    const appId = applications.find(a => a.candidate_email === appDetails.candidate_email || a.job_title === appDetails.job_title)?.id_str;
    if (!appId) return;

    if (!senderEmail || !senderEmail.includes("@")) {
      setEmailStatus({ message: "Enter the Gmail address you want to send from.", type: "error" });
      return;
    }
    if (!appPassword) {
      setEmailStatus({ message: "Enter your Gmail App Password.", type: "error" });
      return;
    }
    if (!emailMessage) {
      setEmailStatus({ message: "Please write a message before sending.", type: "error" });
      return;
    }

    setEmailSending(true);
    setEmailStatus({ message: "", type: "" });

    try {
      const fd = new FormData();
      fd.append("sender_email", senderEmail);
      fd.append("app_password", appPassword);
      fd.append("subject", emailSubject);
      fd.append("message", emailMessage);

      const res = await api.post(`/recruiter/application/${appId}/email/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.success) {
        setEmailStatus({ message: "✅ Email sent to the candidate.", type: "success" });
        setEmailMessage("");
        setAppPassword("");
        setSavedSenderEmail(senderEmail); // save locally
      } else {
        setEmailStatus({ message: res.data.error || "Could not send the email. Please try again.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setEmailStatus({ message: "Network error — please try again.", type: "error" });
    } finally {
      setEmailSending(false);
    }
  };

  const handleDismissApp = async (e, appId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to dismiss this application?")) {
      try {
        const fd = new FormData();
        fd.append("app_id", appId);
        const res = await api.post("/recruiter/application/dismiss/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data && res.data.success) {
          setApplications(prev => prev.filter(app => app.id_str !== appId));
        } else {
          alert(res.data.error || "Failed to dismiss application.");
        }
      } catch (err) {
        console.error(err);
        alert("An error occurred. Please try again.");
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

  // Helper for rendering icons
  const renderJobIcon = (iconName) => {
    switch (iconName) {
      case "code":
        return <i className="bx bx-code-alt"></i>;
      case "backend":
        return <i className="bx bx-server"></i>;
      case "ui":
        return "UI";
      case "database":
        return <i className="bx bx-data"></i>;
      case "marketing":
        return <i className="bx bxs-megaphone"></i>;
      default:
        return <i className="bx bx-briefcase"></i>;
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

  // Filter application list based on search term
  const filteredApps = applications.filter((app) => {
    const term = searchTerm.toLowerCase();
    return (
      app.candidate_name?.toLowerCase().includes(term) ||
      app.job_title?.toLowerCase().includes(term) ||
      app.status?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="recruiter-dashboard-root" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2 style={{ color: "#00d2ff" }}>Loading Recruiter Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="recruiter-dashboard-root">
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
              <li className={viewMode === "overview" ? "active" : ""}>
                <a href="#overview" onClick={(e) => { e.preventDefault(); handleTabClick("overview"); }}>
                  <i className="bx bxs-home-smile"></i> Overview
                </a>
              </li>
              <li>
                <Link to="/recruiter/job/create">
                  <i className="bx bx-briefcase-alt-2"></i> Job Posts
                </Link>
              </li>
              <li className={viewMode === "applications" ? "active" : ""}>
                <a href="#applications" onClick={(e) => { e.preventDefault(); handleTabClick("applications"); }}>
                  <i className="bx bx-folder-open"></i> Applications
                </a>
              </li>
              <li>
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
              <h1>Welcome to ResumeIQ! 👋</h1>
              <p>Let's find the best talent for your company.</p>
            </div>
            <div className="header-actions">
              {/* Notification Badge */}
              <div className="notification-badge" onClick={handleNotifBellClick} style={{ position: "relative", cursor: "pointer" }}>
                <i className="bx bx-bell"></i>
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}

                {/* Notifications Dropdown */}
                {notifDropdownOpen && (
                  <div className="notif-dropdown" onClick={(e) => e.stopPropagation()}>
                    <div className="notif-header">
                      <span>Notifications</span>
                    </div>
                    <div id="notifItemsContainer">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div className="notif-item" key={n.id_str}>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#1e293b", fontWeight: 600 }}>{n.message}</p>
                            <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                          No notifications yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Company Dropdown */}
              <div className="company-dropdown" onClick={() => navigate("/recruiter/settings")}>
                <i className="bx bx-building company-icon"></i>
                <span className="company-name">{latestCompany}</span>
                <i className="bx bx-chevron-down arrow-icon"></i>
              </div>
            </div>
          </header>

          {viewMode === "overview" && (
            <div id="overviewSection">
              {/* Stats Cards */}
              <section className="stats-grid">
                <div className="stat-card cyan-theme">
                  <div className="stat-icon-wrapper">
                    <i className="bx bx-briefcase"></i>
                  </div>
                  <div className="stat-info">
                    <p className="stat-title">Total Job Posts</p>
                    <h3>{stats.totalJobs}</h3>
                    <p className="stat-subtitle">{stats.totalJobs} active job post{stats.totalJobs !== 1 ? "s" : ""}</p>
                  </div>
                </div>

                <div className="stat-card blue-theme">
                  <div className="stat-icon-wrapper">
                    <i className="bx bx-group"></i>
                  </div>
                  <div className="stat-info">
                    <p className="stat-title">Total Applications</p>
                    <h3>{stats.totalApplications}</h3>
                    <p className="stat-subtitle">{stats.totalApplications} application{stats.totalApplications !== 1 ? "s" : ""} received</p>
                  </div>
                </div>

                <div className="stat-card orange-theme">
                  <div className="stat-icon-wrapper">
                    <i className="bx bx-show"></i>
                  </div>
                  <div className="stat-info">
                    <p className="stat-title">Job Views</p>
                    <h3>{stats.totalViews}</h3>
                    <p className="stat-subtitle">{stats.totalViews} view{stats.totalViews !== 1 ? "s" : ""} across your job posts</p>
                  </div>
                </div>
              </section>

              {jobs.length > 0 ? (
                <div className="dashboard-split-grid">
                  {/* Left Column: Recent Job Posts */}
                  <div className="form-section-card" style={{ display: "flex", flexDirection: "column", minHeight: "500px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#00a8e8", margin: 0, display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                        <i className="bx bx-briefcase-alt-2" style={{ color: "#0284c7", fontSize: "1.3rem" }}></i> Recent Job Posts
                      </h3>
                    </div>

                    <div className="recent-jobs-list" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: jobsCollapsed ? "340px" : "1000px", overflowY: jobsCollapsed ? "hidden" : "auto", paddingRight: "0.25rem", transition: "max-height 0.4s ease" }}>
                      {jobs.map((job) => (
                        <div className="job-data-card" key={job.id_str} style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "row", gap: "1rem", alignItems: "flex-start", color: "#1e293b", borderLeft: "4px solid var(--accent-cyan)" }}>
                          <div className="job-icon-box" style={{ ...getJobIconStyle(job.job_icon), width: "60px", height: "60px", borderRadius: "12px", display: "flex", alignItems: "center", justifySpace: "center", flexShrink: 0, fontWeight: 800, fontSize: "1.7rem", justifyContent: "center" }}>
                            {renderJobIcon(job.job_icon)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexGrow: 1 }}>
                            <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#000000", margin: 0, lineHeight: 1.2 }}>{job.job_title}</h4>
                            <p style={{ fontSize: "0.85rem", color: "#0066ff", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <i className="bx bx-buildings" style={{ color: "#00d2ff" }}></i> {job.company_name}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", alignItems: "center" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><i className="bx bx-briefcase" style={{ color: "#0066ff" }}></i> {job.experience_range}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><i className="bx bx-time" style={{ color: "#0066ff" }}></i> {job.get_employment_type_display}</span>
                              {job.location && (
                                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><i className="bx bx-map" style={{ color: "#0066ff" }}></i> {job.location}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid rgba(0, 0, 0, 0.05)", textAlign: "center" }}>
                      <button onClick={() => setJobsCollapsed(!jobsCollapsed)} className="btn-primary-action cyan-gradient-cta" style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", border: "none", cursor: "pointer", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", gap: 0.5, padding: "0.75rem", color: "#ffffff", background: "linear-gradient(135deg, #00d2ff 0%, #0066ff 100%)" }}>
                        {jobsCollapsed ? "View All Jobs" : "Collapse View"} <i className={`bx bx-chevron-${jobsCollapsed ? "down" : "up"}`} id="view-all-icon"></i>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Applications Panel */}
                  <div className="form-section-card" style={{ display: "flex", flexDirection: "column", minHeight: "500px" }}>
                    <div style={{ display: "flex", justifySpace: "space-between", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#00a8e8", margin: 0, display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                        <i className="bx bx-folder-open" style={{ color: "#2563eb", fontSize: "1.3rem" }}></i> Applications
                      </h3>
                    </div>

                    {applications.length > 0 ? (
                      <>
                        <div className="applications-list" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: appsCollapsed ? "340px" : "1000px", overflowY: appsCollapsed ? "hidden" : "auto", paddingRight: "0.25rem" }}>
                          {applications.map((app) => (
                            <div className="job-data-card" key={app.id_str} onClick={() => openAppDetails(app.id_str)} style={{ position: "relative", backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "row", gap: "1rem", alignItems: "flex-start", color: "#1e293b", borderLeft: `4px solid ${app.status === "Hired" ? "#16a34a" : app.status === "Rejected" ? "#dc2626" : "#2563eb"}`, cursor: "pointer" }}>
                              <button className="dismiss-app-btn" onClick={(e) => handleDismissApp(e, app.id_str)} style={{ position: "absolute", top: "10px", right: "10px", border: "none", background: "transparent", color: "#94a3b8", fontSize: "1.1rem", cursor: "pointer", transition: "color 0.2s", zIndex: 10 }} title="Dismiss application">×</button>
                              <div style={{ width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: "1.05rem", backgroundColor: "#eff6ff", color: "#2563eb" }}>
                                {(app.candidate_name || "C").slice(0, 1).toUpperCase()}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexGrow: 1 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                                  <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#000000", margin: 0, lineHeight: 1.2 }}>{app.candidate_name || "Candidate"}</h4>
                                  <span style={{ flexShrink: 0, fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.55rem", borderRadius: "999px", ...(app.ats_score >= 80 ? { backgroundColor: "#dcfce7", color: "#16a34a" } : app.ats_score >= 60 ? { backgroundColor: "#fef3c7", color: "#b45309" } : { backgroundColor: "#fee2e2", color: "#dc2626" }) }}>
                                    {app.ats_score || 0}% ATS
                                  </span>
                                </div>
                                <p style={{ fontSize: "0.85rem", color: "#0066ff", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                  <i className="bx bx-briefcase-alt-2" style={{ color: "#2563eb" }}></i> {app.job_title}
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", alignItems: "center" }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><i className="bx bx-calendar" style={{ color: "#0066ff" }}></i> {app.applied_on || "Recently"}</span>
                                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: app.status === "Hired" ? "#16a34a" : app.status === "Rejected" ? "#dc2626" : "#0284c7" }}><i className="bx bx-check-circle"></i> {app.status || "Under Review"}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid rgba(0, 0, 0, 0.05)", textAlign: "center" }}>
                          <button onClick={() => setAppsCollapsed(!appsCollapsed)} className="btn-primary-action cyan-gradient-cta" style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", border: "none", cursor: "pointer", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", gap: 0.5, padding: "0.75rem", color: "#ffffff", background: "linear-gradient(135deg, #00d2ff 0%, #0066ff 100%)" }}>
                            {appsCollapsed ? "View All Applications" : "Collapse View"} <i className={`bx bx-chevron-${appsCollapsed ? "down" : "up"}`} id="view-all-apps-icon"></i>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                        <div style={{ background: "rgba(37, 99, 235, 0.05)", border: "1px dashed rgba(37, 99, 235, 0.2)", borderRadius: "50%", padding: "2rem", marginBottom: "1rem" }}>
                          <i className="bx bx-folder-open" style={{ fontSize: "3rem", color: "#2563eb" }}></i>
                        </div>
                        <h4 style={{ margin: 0, color: "#1e293b" }}>No Application Yet</h4>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem", maxWidth: "300px" }}>
                          Applications from candidates will show up here as soon as they apply to your job posts.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <section className="empty-state-section">
                  <div className="empty-state-content">
                    <div className="illustration-container">
                      <div className="glow-effect"></div>
                      <div className="graphic-wrapper">
                        <i className="bx bx-file document-icon"></i>
                        <i className="bx bx-briefcase briefcase-icon"></i>
                        <i className="bx bx-paper-plane plane-icon"></i>
                      </div>
                    </div>

                    <h2>Welcome Aboard!</h2>
                    <p>You haven't created any job posts yet.<br />Create your first job post and start receiving applications from top candidates.</p>

                    <Link to="/recruiter/job/create" className="btn-primary-action cyan-gradient-cta">
                      + Create Your First Job Post
                    </Link>
                  </div>
                </section>
              )}
            </div>
          )}

          {viewMode === "applications" && (
            <div id="allApplicationsSection">
              <div className="form-section-card" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#00a8e8", margin: 0, display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                    <i className="bx bx-folder-open" style={{ color: "#2563eb", fontSize: "1.3rem" }}></i> All Applications
                  </h3>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b" }}>{filteredApps.length} shown ({applications.length} total)</span>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <input
                    type="text"
                    placeholder="Search applicants by name, job, or status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: "100%", padding: "0.85rem 1.25rem", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)", backgroundColor: "var(--bg-input-dark)", color: "#fff", outline: "none", fontSize: "0.95rem" }}
                  />
                </div>

                {filteredApps.length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                    {filteredApps.map((application) => (
                      <div className="job-data-card app-card" key={application.id_str} style={{ position: "relative", backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "0.75rem", color: "#1e293b", borderLeft: `4px solid ${application.status === "Hired" ? "#16a34a" : application.status === "Rejected" ? "#dc2626" : "#2563eb"}` }}>
                        <button className="dismiss-app-btn" onClick={(e) => handleDismissApp(e, application.id_str)} style={{ position: "absolute", top: "10px", right: "10px", border: "none", background: "transparent", color: "#94a3b8", fontSize: "1.1rem", cursor: "pointer", transition: "color 0.2s", zIndex: 10 }} title="Dismiss application">×</button>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                          <div style={{ width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: "1.05rem", backgroundColor: "#eff6ff", color: "#2563eb" }}>
                            {(application.candidate_name || "C").slice(0, 1).toUpperCase()}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flexGrow: 1 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
                              <h4 style={{ fontSize: "1.02rem", fontWeight: 800, color: "#000000", margin: 0, lineHeight: 1.2 }}>{application.candidate_name || "Candidate"}</h4>
                              <span style={{ flexShrink: 0, fontSize: "0.72rem", fontWeight: 800, padding: "0.2rem 0.55rem", borderRadius: "999px", ...(application.ats_score >= 80 ? { backgroundColor: "#dcfce7", color: "#16a34a" } : application.ats_score >= 60 ? { backgroundColor: "#fef3c7", color: "#b45309" } : { backgroundColor: "#fee2e2", color: "#dc2626" }) }}>
                                {application.ats_score || 0}% ATS
                              </span>
                            </div>
                            <p style={{ fontSize: "0.85rem", color: "#0066ff", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                              <i className="bx bx-briefcase-alt-2" style={{ color: "#2563eb" }}></i> {application.job_title}
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", fontSize: "0.75rem", fontWeight: 600, color: "#475569", alignItems: "center" }}>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><i className="bx bx-calendar" style={{ color: "#0066ff" }}></i> {application.applied_on || "Recently"}</span>
                              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: application.status === "Hired" ? "#16a34a" : application.status === "Rejected" ? "#dc2626" : "#0284c7" }}><i className="bx bx-check-circle"></i> {application.status || "Under Review"}</span>
                            </div>
                          </div>
                        </div>
                        <button className="btn-view-details" onClick={() => openAppDetails(application.id_str)} style={{ alignSelf: "flex-start", padding: "0.5rem 0.9rem", borderRadius: "8px", border: "none", background: "linear-gradient(135deg,#00d2ff,#0066ff)", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                          <i className="bx bx-show"></i> View Details
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem 0" }}>
                    <div style={{ background: "rgba(37, 99, 235, 0.05)", border: "1px dashed rgba(37, 99, 235, 0.2)", borderRadius: "50%", padding: "2rem", marginBottom: "1rem" }}>
                      <i className="bx bx-folder-open" style={{ fontSize: "3rem", color: "#2563eb" }}></i>
                    </div>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>No Applications Found</h4>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem", maxWidth: "300px" }}>
                      No applications matched your search filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Details Modal */}
      {modalOpen && (
        <div className="details-modal-overlay" onClick={closeAppModal}>
          <div className="details-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", height: "auto", maxHeight: "88vh", overflowY: "auto", padding: "1.75rem", position: "relative" }}>
            <button className="details-modal-close" onClick={closeAppModal} style={{ position: "absolute", top: "1rem", right: "1rem" }}>✕</button>

            {appDetailsLoading ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <h3 style={{ color: "var(--accent-blue)" }}>Loading application details...</h3>
              </div>
            ) : appDetails ? (
              <div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ width: "56px", height: "56px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.2rem", flexShrink: 0, backgroundColor: "#eff6ff", color: "#2563eb" }}>
                    {(appDetails.candidate_name || "C").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>{appDetails.candidate_name}</h3>
                    <p style={{ margin: "0.15rem 0 0", color: "#2563eb", fontWeight: 600, fontSize: "0.9rem" }}>{appDetails.job_title} • {appDetails.company_name}</p>
                  </div>
                  <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: "0.85rem", padding: "0.3rem 0.7rem", borderRadius: "999px", backgroundColor: "#eff6ff", color: "#2563eb", flexShrink: 0 }}>
                    {appDetails.ats_score || 0}% ATS
                  </span>
                </div>

                {appDetails.status && appDetails.status !== "Under Review" && (
                  <div className="status-badge-banner" style={{
                    backgroundColor: appDetails.status === "Hired" ? "#dcfce7" : "#fee2e2",
                    color: appDetails.status === "Hired" ? "#16a34a" : "#dc2626",
                    padding: "0.6rem 0.9rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "1rem"
                  }}>
                    {appDetails.status === "Hired" ? "🎉 This candidate has been hired." : "This candidate was not selected."}
                  </div>
                )}

                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>Candidate Summary</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.85rem" }}>
                    <div><strong>Email:</strong> {appDetails.resume_summary?.email || appDetails.candidate_email}</div>
                    <div><strong>Phone:</strong> {appDetails.resume_summary?.phone || "Not found"}</div>
                    <div><strong>Experience:</strong> {appDetails.resume_summary?.experience || "Not specified"}</div>
                    <div><strong>Applied on:</strong> {appDetails.applied_on || "Recently"}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.6rem" }}>
                    {appDetails.resume_summary?.key_skills?.map((skill, idx) => (
                      <span key={idx} style={{ backgroundColor: "#eff6ff", color: "#2563eb", fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "999px" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>Resume</p>
                  {appDetails.resume_pdf_url && (
                    <a href={appDetails.resume_pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", padding: "0.9rem", borderRadius: "10px", border: "1px solid #bfdbfe", backgroundColor: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", marginBottom: "0.6rem" }}>
                      <i className="bx bxs-file-pdf" style={{ fontSize: "1.2rem" }}></i> View Resume (PDF)
                    </a>
                  )}
                  {appDetails.resume_text && (
                    <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.9rem", maxHeight: "260px", overflowY: "auto", fontFamily: "inherit", fontSize: "0.82rem", lineHeight: 1.5, margin: 0 }}>
                      {appDetails.resume_text}
                    </pre>
                  )}
                </div>

                {/* Email Panel */}
                {emailPanelOpen ? (
                  <form onSubmit={handleSendEmail} className="email-compose-panel" style={{ marginBottom: "1rem", padding: "0.9rem", border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "#f8fafc" }}>
                    <p style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email Candidate</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <input type="email" placeholder="Your Gmail address" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem" }} required />
                      <input type="password" placeholder="Gmail App Password" value={appPassword} onChange={(e) => setAppPassword(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem" }} required />
                    </div>
                    <p style={{ margin: "0 0 0.6rem", fontSize: "0.72rem", color: "#94a3b8" }}>Use a 16-character <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>Gmail App Password</a>, not your normal password.</p>
                    <input type="text" placeholder="Subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", marginBottom: "0.5rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem" }} required />
                    <textarea rows="5" placeholder="Write your message to the candidate..." value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.85rem", resize: "vertical" }} required></textarea>
                    {emailStatus.message && (
                      <p style={{ color: emailStatus.type === "success" ? "#16a34a" : "#dc2626", margin: "0.5rem 0 0", fontSize: "0.8rem", fontWeight: 600 }}>{emailStatus.message}</p>
                    )}
                    <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem" }}>
                      <button type="button" onClick={() => setEmailPanelOpen(false)} style={{ flex: 1, padding: "0.65rem", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "transparent", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                      <button type="submit" disabled={emailSending} style={{ flex: 1.4, padding: "0.65rem", borderRadius: "8px", border: "none", backgroundColor: "var(--accent-blue)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        {emailSending ? "Sending..." : "Send Email"}
                      </button>
                    </div>
                  </form>
                ) : null}

                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={closeAppModal} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "transparent", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Close</button>
                  <button onClick={() => setEmailPanelOpen(true)} disabled={!appDetails.candidate_email} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #bfdbfe", backgroundColor: "#eff6ff", color: "#1d4ed8", fontWeight: 700, cursor: "pointer" }}>✉️ Email</button>
                  <button onClick={() => handleUpdateStatusCorrect("Rejected")} disabled={appDetails.status === "Rejected"} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid #fecaca", backgroundColor: "#fff1f2", color: "#dc2626", fontWeight: 700, cursor: "pointer" }}>Reject</button>
                  <button onClick={() => handleUpdateStatusCorrect("Hired")} disabled={appDetails.status === "Hired"} style={{ flex: 1.4, padding: "0.75rem", borderRadius: "8px", border: "none", backgroundColor: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>✅ Hire Candidate</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <p>Could not load details.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
