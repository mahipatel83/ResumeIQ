import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import "./SuperadminDashboard.css";

export default function SuperadminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";

  // Auth / Profile
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // General Notification Alert
  const [alert, setAlert] = useState({ show: false, type: "", text: "" });

  // Dashboard Tab Data
  const [dashboardData, setDashboardData] = useState(null);

  // Users Tab Data
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // Null if adding new user
  const [userForm, setUserForm] = useState({
    fullname: "",
    email: "",
    password: "",
    role: "customer",
    company_name: ""
  });

  // Jobs Tab Data
  const [jobs, setJobs] = useState([]);
  const [jobSearch, setJobSearch] = useState("");
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null); // Null if adding new job
  const [jobForm, setJobForm] = useState({
    company_name: "",
    job_title: "",
    job_icon: "ui",
    recruiter_email: "",
    employment_type: "full_time",
    experience_level: "mid",
    exp_min: "2",
    exp_max: "5",
    location: "Remote",
    is_remote: true
  });

  // Drafts Tab Data
  const [drafts, setDrafts] = useState([]);

  // Database Explorer Tab Data
  const [sqliteTables, setSqliteTables] = useState([]);
  const [mongoCollections, setMongoCollections] = useState([]);
  const [selectedMongoCol, setSelectedMongoCol] = useState("");
  const [selectedSqliteTbl, setSelectedSqliteTbl] = useState("");
  const [mongoDocs, setMongoDocs] = useState([]);
  const [sqliteRows, setSqliteRows] = useState([]);
  const [sqliteColumns, setSqliteColumns] = useState([]);

  // Load initial session validation & first tab data
  useEffect(() => {
    validateSession();
  }, []);

  // Sync state fetches based on tab changes
  useEffect(() => {
    if (userEmail) {
      fetchTabValues();
    }
  }, [currentTab, searchParams, userEmail]);

  const validateSession = async () => {
    try {
      // Call admin dashboard API directly to verify session and admin role
      const res = await api.get("/admin-panel/?format=json");
      if (res.data) {
        setUserEmail(res.data.user_name || "Admin");
      }
    } catch (err) {
      console.error("Admin authorization failed", err);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchTabValues = async () => {
    try {
      if (currentTab === "dashboard") {
        const res = await api.get("/admin-panel/?format=json");
        setDashboardData(res.data);
      } else if (currentTab === "users") {
        const q = searchParams.get("q") || "";
        setUserSearch(q);
        const res = await api.get(`/admin-panel/users/?format=json&q=${encodeURIComponent(q)}`);
        setUsers(res.data.users || []);
      } else if (currentTab === "jobs") {
        const q = searchParams.get("q") || "";
        setJobSearch(q);
        const res = await api.get(`/admin-panel/jobs/?format=json&q=${encodeURIComponent(q)}`);
        setJobs(res.data.jobs || []);
      } else if (currentTab === "drafts") {
        const res = await api.get("/admin-panel/drafts/?format=json");
        setDrafts(res.data.drafts || []);
      } else if (currentTab === "explorer") {
        const mCol = searchParams.get("mongo_col") || "";
        const sTbl = searchParams.get("sqlite_tbl") || "";
        setSelectedMongoCol(mCol);
        setSelectedSqliteTbl(sTbl);

        const res = await api.get(`/admin-panel/explorer/?format=json&mongo_col=${mCol}&sqlite_tbl=${sTbl}`);
        setSqliteTables(res.data.sqlite_tables || []);
        setMongoCollections(res.data.mongo_collections || []);
        setMongoDocs(res.data.mongo_docs || []);
        setSqliteRows(res.data.sqlite_rows || []);
        setSqliteColumns(res.data.sqlite_columns || []);
      }
    } catch (err) {
      console.error(`Error loading tab ${currentTab}:`, err);
      showAlert("error", `Failed to load ${currentTab} data.`);
    }
  };

  const showAlert = (type, text) => {
    setAlert({ show: true, type, text });
    setTimeout(() => {
      setAlert({ show: false, type: "", text: "" });
    }, 5000);
  };

  const changeTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  const handleLogout = async () => {
    try {
      await api.post("/accounts/logout/");
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
      navigate("/login");
    }
  };

  // --- USER HANDLERS ---
  const triggerUserSearch = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      setSearchParams({ tab: "users", q: userSearch });
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserForm({
      fullname: "",
      email: "",
      password: "",
      role: "customer",
      company_name: ""
    });
    setUserFormOpen(true);
  };

  const openEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      fullname: user.fullname || "",
      email: user.email || "",
      password: "", // keep blank unless resetting
      role: user.role || "customer",
      company_name: user.company_name || ""
    });
    setUserFormOpen(true);
  };

  const submitUserForm = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Edit User
        await api.post(`/admin-panel/users/edit/${editingUser.id_str}/?format=json`, userForm);
        showAlert("success", "User profile updated successfully!");
      } else {
        // Add User
        await api.post("/admin-panel/users/add/?format=json", userForm);
        showAlert("success", "New user registered successfully!");
      }
      setUserFormOpen(false);
      fetchTabValues();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Error saving user details.";
      showAlert("error", errMsg);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.post(`/admin-panel/users/delete/${userId}/`);
      showAlert("success", "User deleted successfully.");
      fetchTabValues();
    } catch (err) {
      showAlert("error", "Failed to delete user.");
    }
  };

  // --- JOB HANDLERS ---
  const triggerJobSearch = (e) => {
    if (e.key === "Enter" || e.type === "click") {
      setSearchParams({ tab: "jobs", q: jobSearch });
    }
  };

  const openAddJob = () => {
    setEditingJob(null);
    setJobForm({
      company_name: "",
      job_title: "",
      job_icon: "ui",
      recruiter_email: "",
      employment_type: "full_time",
      experience_level: "mid",
      exp_min: "2",
      exp_max: "5",
      location: "Remote",
      is_remote: true
    });
    setJobFormOpen(true);
  };

  const openEditJob = (job) => {
    setEditingJob(job);
    let exp_min = "0";
    let exp_max = "2";
    if (job.experience_range && job.experience_range.includes("-")) {
      const parts = job.experience_range.split(" ")[0].split("-");
      exp_min = parts[0] || "0";
      exp_max = parts[1] || "2";
    }
    setJobForm({
      company_name: job.company_name || "",
      job_title: job.job_title || "",
      job_icon: job.job_icon || "ui",
      recruiter_email: job.recruiter_email || "",
      employment_type: job.employment_type || "full_time",
      experience_level: job.experience_level || "mid",
      exp_min,
      exp_max,
      location: job.location || "",
      is_remote: job.is_remote || false
    });
    setJobFormOpen(true);
  };

  const submitJobForm = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        // Edit Job
        await api.post(`/admin-panel/jobs/edit/${editingJob.id_str}/?format=json`, jobForm);
        showAlert("success", "Job posting updated successfully!");
      } else {
        // Add Job
        await api.post("/admin-panel/jobs/add/?format=json", jobForm);
        showAlert("success", "New job listing added successfully!");
      }
      setJobFormOpen(false);
      fetchTabValues();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Error saving job listing.";
      showAlert("error", errMsg);
    }
  };

  const deleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job listing?")) return;
    try {
      await api.post(`/admin-panel/jobs/delete/${jobId}/`);
      showAlert("success", "Job listing deleted successfully.");
      fetchTabValues();
    } catch (err) {
      showAlert("error", "Failed to delete job listing.");
    }
  };

  // --- DRAFTS HANDLERS ---
  const deleteDraft = async (draftId) => {
    if (!window.confirm("Are you sure you want to delete this job draft?")) return;
    try {
      await api.post(`/admin-panel/drafts/delete/${draftId}/`);
      showAlert("success", "Draft deleted successfully.");
      fetchTabValues();
    } catch (err) {
      showAlert("error", "Failed to delete draft.");
    }
  };

  // --- DB EXPLORER HANDLERS ---
  const selectMongoColItem = (colName) => {
    setSearchParams({ tab: "explorer", mongo_col: colName });
  };

  const selectSqliteTblItem = (tblName) => {
    setSearchParams({ tab: "explorer", sqlite_tbl: tblName });
  };

  const deleteMongoDocument = async (colName, docId) => {
    if (!window.confirm("Are you sure you want to delete this document from MongoDB?")) return;
    try {
      await api.post(`/admin-panel/explorer/mongodb/${colName}/delete/${docId}/`);
      showAlert("success", "MongoDB document deleted successfully.");
      fetchTabValues();
    } catch (err) {
      showAlert("error", "Failed to delete MongoDB document.");
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#080c14", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "1.2rem", color: "#38bdf8", fontWeight: 600 }}>Validating session...</div>
      </div>
    );
  }

  return (
    <div className="superadmin-container">
      {/* Sidebar */}
      <aside className="sa-sidebar">
        <div className="sa-logo-container">
          <div className="sa-logo-text">ResumeIQ</div>
          <span className="sa-logo-badge">Admin</span>
        </div>

        <ul className="sa-nav-menu">
          <li className={`sa-nav-item ${currentTab === "dashboard" ? "active" : ""}`}>
            <button onClick={() => changeTab("dashboard")}>
              <span>📊</span> Dashboard
            </button>
          </li>
          <li className={`sa-nav-item ${currentTab === "users" ? "active" : ""}`}>
            <button onClick={() => changeTab("users")}>
              <span>👥</span> Users Management
            </button>
          </li>
          <li className={`sa-nav-item ${currentTab === "jobs" ? "active" : ""}`}>
            <button onClick={() => changeTab("jobs")}>
              <span>💼</span> Jobs Listings
            </button>
          </li>
          <li className={`sa-nav-item ${currentTab === "drafts" ? "active" : ""}`}>
            <button onClick={() => changeTab("drafts")}>
              <span>📄</span> Job Drafts
            </button>
          </li>
          <li className={`sa-nav-item ${currentTab === "explorer" ? "active" : ""}`}>
            <button onClick={() => changeTab("explorer")}>
              <span>🗄️</span> DB Explorer
            </button>
          </li>
        </ul>

        <div className="sa-sidebar-footer">
          <button className="sa-logout-btn" onClick={handleLogout}>
            <span>🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="sa-main-wrapper">
        <header className="sa-top-header">
          <div className="sa-page-title">
            <h1>
              {currentTab === "dashboard" && "Dashboard Overview"}
              {currentTab === "users" && "Users Management"}
              {currentTab === "jobs" && "Job Postings"}
              {currentTab === "drafts" && "Recruiter Job Drafts"}
              {currentTab === "explorer" && "Database Explorer"}
            </h1>
            <p>
              {currentTab === "dashboard" && "Realtime analytics & database health monitors"}
              {currentTab === "users" && "Create, edit, view, or remove registered accounts"}
              {currentTab === "jobs" && "Inspect active job listings and posting indexes"}
              {currentTab === "drafts" && "Manage temporary or unposted job drafts"}
              {currentTab === "explorer" && "Inspect SQLite schema tables and MongoDB collections raw states"}
            </p>
          </div>

          <div className="sa-user-profile-header">
            <div className="sa-avatar">A</div>
            <div className="sa-profile-info">
              <div className="sa-profile-name">{userEmail}</div>
              <div className="sa-profile-role">Super Administrator</div>
            </div>
          </div>
        </header>

        {alert.show && (
          <div className={`sa-alert-banner sa-alert-${alert.type}`}>
            <span>{alert.text}</span>
            <button onClick={() => setAlert({ show: false, type: "", text: "" })} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
          </div>
        )}

        <main>
          {/* 1. DASHBOARD TAB */}
          {currentTab === "dashboard" && dashboardData && (
            <>
              {/* Stats Counters */}
              <div className="sa-stats-grid">
                <div className="sa-stat-card">
                  <div className="sa-stat-info">
                    <h3>Total Users</h3>
                    <div className="sa-stat-val">{dashboardData.total_users}</div>
                  </div>
                  <div className="sa-stat-icon-wrap sa-icon-blue">👥</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-info">
                    <h3>Active Jobs</h3>
                    <div className="sa-stat-val">{dashboardData.total_jobs}</div>
                  </div>
                  <div className="sa-stat-icon-wrap sa-icon-green">💼</div>
                </div>
                <div className="sa-stat-card">
                  <div className="sa-stat-info">
                    <h3>Saved Drafts</h3>
                    <div className="sa-stat-val">{dashboardData.total_drafts}</div>
                  </div>
                  <div className="sa-stat-icon-wrap sa-icon-purple">📄</div>
                </div>
              </div>

              {/* Database Connections */}
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>🖧 System Connections</h2>
              <div className="sa-db-health-grid">
                <div className="sa-db-card sqlite">
                  <div className="sa-db-header">
                    <span className="sa-db-title">SQLite Database</span>
                    <span className={`sa-status-badge ${dashboardData.sqlite_status === "Connected" ? "online" : "offline"}`}>
                      {dashboardData.sqlite_status}
                    </span>
                  </div>
                  <div className="sa-db-detail-row">
                    <span className="sa-db-label">Backend Engine</span>
                    <span className="sa-db-val">Django ORM</span>
                  </div>
                  <div className="sa-db-detail-row">
                    <span className="sa-db-label">Error Details</span>
                    <span className="sa-db-val">{dashboardData.sqlite_err || "None"}</span>
                  </div>
                </div>

                <div className="sa-db-card mongodb">
                  <div className="sa-db-header">
                    <span className="sa-db-title">MongoDB NoSQL</span>
                    <span className={`sa-status-badge ${dashboardData.mongo_status === "Connected" ? "online" : "offline"}`}>
                      {dashboardData.mongo_status}
                    </span>
                  </div>
                  <div className="sa-db-detail-row">
                    <span className="sa-db-label">Target Collections</span>
                    <span className="sa-db-val">users, jobs, applications</span>
                  </div>
                  <div className="sa-db-detail-row">
                    <span className="sa-db-label">Error Details</span>
                    <span className="sa-db-val">{dashboardData.mongo_err || "None"}</span>
                  </div>
                </div>
              </div>

              {/* Recent lists */}
              <div className="sa-charts-grid">
                <div className="sa-panel-card">
                  <div className="sa-panel-title">👥 Recently Registered Users</div>
                  <div className="sa-table-container">
                    <table className="sa-admin-table">
                      <thead>
                        <tr>
                          <th>Full Name</th>
                          <th>Email</th>
                          <th>Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recent_users && dashboardData.recent_users.map((u, i) => (
                          <tr key={i}>
                            <td>{u.fullname}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`sa-badge-role ${u.role === "admin" ? "sa-role-admin" : u.role === "recruiter" ? "sa-role-recruiter" : "sa-role-candidate"}`}>
                                {u.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sa-panel-card">
                  <div className="sa-panel-title">💼 Recent Jobs</div>
                  <div className="sa-table-container">
                    <table className="sa-admin-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Company</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.recent_jobs && dashboardData.recent_jobs.map((j, i) => (
                          <tr key={i}>
                            <td>{j.job_title}</td>
                            <td>{j.company_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 2. USERS TAB */}
          {currentTab === "users" && (
            <div className="sa-panel-card">
              <div className="sa-panel-title">
                <span>Account Directories</span>
                <button className="sa-btn sa-btn-primary" onClick={openAddUser}>➕ Add User</button>
              </div>

              <div className="sa-search-wrap">
                <input
                  type="text"
                  className="sa-search-input"
                  placeholder="Search by name, email, or role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={triggerUserSearch}
                />
                <button className="sa-btn sa-btn-secondary" onClick={triggerUserSearch}>🔍 Search</button>
              </div>

              <div className="sa-table-container">
                <table className="sa-admin-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Recruiter Company</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id_str}>
                        <td>{u.fullname}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`sa-badge-role ${u.role === "admin" ? "sa-role-admin" : u.role === "recruiter" ? "sa-role-recruiter" : "sa-role-candidate"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>{u.company_name || "—"}</td>
                        <td className="sa-actions-cell">
                          <button className="sa-btn-icon edit" onClick={() => openEditUser(u)}>✏️</button>
                          <button className="sa-btn-icon delete" onClick={() => deleteUser(u.id_str)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>No users match the query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. JOBS TAB */}
          {currentTab === "jobs" && (
            <div className="sa-panel-card">
              <div className="sa-panel-title">
                <span>Active Listings Directory</span>
                <button className="sa-btn sa-btn-primary" onClick={openAddJob}>➕ Post Job</button>
              </div>

              <div className="sa-search-wrap">
                <input
                  type="text"
                  className="sa-search-input"
                  placeholder="Search by company, title, level, or location..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  onKeyDown={triggerJobSearch}
                />
                <button className="sa-btn sa-btn-secondary" onClick={triggerJobSearch}>🔍 Search</button>
              </div>

              <div className="sa-table-container">
                <table className="sa-admin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Company</th>
                      <th>Recruiter</th>
                      <th>Type</th>
                      <th>Experience</th>
                      <th>Location</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id_str}>
                        <td style={{ fontWeight: 600 }}>{j.job_title}</td>
                        <td>{j.company_name}</td>
                        <td>{j.recruiter_email}</td>
                        <td style={{ textTransform: "capitalize" }}>{j.employment_type?.replace("_", " ")}</td>
                        <td>{j.experience_range || "0-2 Years"}</td>
                        <td>{j.location} {j.is_remote && " (Remote)"}</td>
                        <td className="sa-actions-cell">
                          <button className="sa-btn-icon edit" onClick={() => openEditJob(j)}>✏️</button>
                          <button className="sa-btn-icon delete" onClick={() => deleteJob(j.id_str)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>No job postings match the query.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. DRAFTS TAB */}
          {currentTab === "drafts" && (
            <div className="sa-panel-card">
              <div className="sa-panel-title">Job Posting Drafts</div>
              <div className="sa-table-container">
                <table className="sa-admin-table">
                  <thead>
                    <tr>
                      <th>Draft Title</th>
                      <th>Company Name</th>
                      <th>Recruiter Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drafts.map((d) => (
                      <tr key={d.id_str}>
                        <td style={{ fontWeight: 600 }}>{d.job_title || "Untitled Draft"}</td>
                        <td>{d.company_name || "—"}</td>
                        <td>{d.recruiter_email || "—"}</td>
                        <td className="sa-actions-cell">
                          <button className="sa-btn-icon delete" onClick={() => deleteDraft(d.id_str)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {drafts.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>No recruiter drafts exist.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. DATABASE EXPLORER TAB */}
          {currentTab === "explorer" && (
            <div className="sa-explorer-grid">
              {/* Sidebar collections */}
              <div className="sa-explorer-sidebar">
                <div>
                  <h3 className="sa-db-list-title">MongoDB NoSQL</h3>
                  <ul className="sa-db-items">
                    {mongoCollections.map((col) => (
                      <li key={col.name} className={`sa-db-item ${selectedMongoCol === col.name ? "active" : ""}`}>
                        <button onClick={() => selectMongoColItem(col.name)}>
                          <span>{col.name}</span>
                          <span className="sa-db-item-count">{col.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="sa-db-list-title">SQLite SQL Tables</h3>
                  <ul className="sa-db-items">
                    {sqliteTables.map((tbl) => (
                      <li key={tbl.name} className={`sa-db-item ${selectedSqliteTbl === tbl.name ? "active" : ""}`}>
                        <button onClick={() => selectSqliteTblItem(tbl.name)}>
                          <span>{tbl.name}</span>
                          <span className="sa-db-item-count">{tbl.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Data Panel */}
              <div className="sa-panel-card" style={{ overflowX: "hidden" }}>
                {selectedMongoCol && (
                  <div>
                    <div className="sa-panel-title">
                      <span>MongoDB: `{selectedMongoCol}` (Showing top 100 docs)</span>
                    </div>

                    {mongoDocs.map((doc) => (
                      <div key={doc.id} className="sa-doc-json-card">
                        <div className="sa-doc-json-header">
                          <span className="sa-doc-id">ID: {doc.id}</span>
                          <button className="sa-btn sa-btn-danger" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }} onClick={() => deleteMongoDocument(selectedMongoCol, doc.id)}>
                            🗑️ Delete Document
                          </button>
                        </div>
                        <pre className="sa-json-pre">{doc.content_json}</pre>
                      </div>
                    ))}

                    {mongoDocs.length === 0 && (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No documents found in this collection.</div>
                    )}
                  </div>
                )}

                {selectedSqliteTbl && (
                  <div>
                    <div className="sa-panel-title">SQLite: `{selectedSqliteTbl}` (Showing top 100 rows)</div>
                    <div className="sa-table-container">
                      <table className="sa-admin-table" style={{ fontSize: "0.8rem" }}>
                        <thead>
                          <tr>
                            {sqliteColumns.map((col, idx) => (
                              <th key={idx}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqliteRows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((val, cIdx) => (
                                <td key={cIdx}>{val !== null && val !== undefined ? String(val) : "NULL"}</td>
                              ))}
                            </tr>
                          ))}
                          {sqliteRows.length === 0 && (
                            <tr>
                              <td colSpan={sqliteColumns.length || 1} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>Table has no rows.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!selectedMongoCol && !selectedSqliteTbl && (
                  <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗄️</div>
                    <h3>Select a collection or table from the explorer sidebar to view records.</h3>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- FORM MODAL: ADD / EDIT USER --- */}
      {userFormOpen && (
        <div className="sa-form-overlay">
          <form className="sa-form-panel" onSubmit={submitUserForm}>
            <div className="sa-form-title">{editingUser ? "✏️ Edit Account Profile" : "👤 Register User Account"}</div>

            <div className="sa-form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="sa-form-control"
                required
                value={userForm.fullname}
                onChange={(e) => setUserForm({ ...userForm, fullname: e.target.value })}
              />
            </div>

            <div className="sa-form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="sa-form-control"
                required
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>

            <div className="sa-form-group">
              <label>Password {editingUser && "(Leave blank to keep current password)"}</label>
              <input
                type="password"
                className="sa-form-control"
                required={!editingUser}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              />
            </div>

            <div className="sa-form-group">
              <label>Account Role</label>
              <select
                className="sa-form-control"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="customer">Candidate / Job Seeker</option>
                <option value="recruiter">Recruiter / Employer</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            {userForm.role === "recruiter" && (
              <div className="sa-form-group">
                <label>Company Association Name</label>
                <input
                  type="text"
                  className="sa-form-control"
                  required
                  placeholder="e.g. Acme Tech Solutions"
                  value={userForm.company_name}
                  onChange={(e) => setUserForm({ ...userForm, company_name: e.target.value })}
                />
              </div>
            )}

            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setUserFormOpen(false)}>Cancel</button>
              <button type="submit" className="sa-btn sa-btn-primary">Save Profile</button>
            </div>
          </form>
        </div>
      )}

      {/* --- FORM MODAL: ADD / EDIT JOB --- */}
      {jobFormOpen && (
        <div className="sa-form-overlay">
          <form className="sa-form-panel" onSubmit={submitJobForm}>
            <div className="sa-form-title">{editingJob ? "✏️ Edit Job Posting" : "💼 Post System Job Listing"}</div>

            <div className="sa-form-row">
              <div className="sa-form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  className="sa-form-control"
                  required
                  placeholder="e.g. Senior React Developer"
                  value={jobForm.job_title}
                  onChange={(e) => setJobForm({ ...jobForm, job_title: e.target.value })}
                />
              </div>

              <div className="sa-form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  className="sa-form-control"
                  required
                  placeholder="e.g. Acme Corp"
                  value={jobForm.company_name}
                  onChange={(e) => setJobForm({ ...jobForm, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="sa-form-row">
              <div className="sa-form-group">
                <label>Recruiter Owner Email</label>
                <input
                  type="email"
                  className="sa-form-control"
                  required
                  placeholder="recruiter@company.com"
                  value={jobForm.recruiter_email}
                  onChange={(e) => setJobForm({ ...jobForm, recruiter_email: e.target.value })}
                />
              </div>

              <div className="sa-form-group">
                <label>Employment Type</label>
                <select
                  className="sa-form-control"
                  value={jobForm.employment_type}
                  onChange={(e) => setJobForm({ ...jobForm, employment_type: e.target.value })}
                >
                  <option value="full_time">Full-time</option>
                  <option value="part_time">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
            </div>

            <div className="sa-form-row">
              <div className="sa-form-group">
                <label>Job Icon Category</label>
                <select
                  className="sa-form-control"
                  value={jobForm.job_icon}
                  onChange={(e) => setJobForm({ ...jobForm, job_icon: e.target.value })}
                >
                  <option value="ui">Frontend / UI</option>
                  <option value="database">Database / SQL</option>
                  <option value="cloud">Devops / Cloud</option>
                  <option value="code">Backend Developer</option>
                </select>
              </div>

              <div className="sa-form-group">
                <label>Experience Tier</label>
                <select
                  className="sa-form-control"
                  value={jobForm.experience_level}
                  onChange={(e) => setJobForm({ ...jobForm, experience_level: e.target.value })}
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                </select>
              </div>
            </div>

            <div className="sa-form-row">
              <div className="sa-form-group">
                <label>Experience Range Min (Years)</label>
                <input
                  type="number"
                  min="0"
                  className="sa-form-control"
                  value={jobForm.exp_min}
                  onChange={(e) => setJobForm({ ...jobForm, exp_min: e.target.value })}
                />
              </div>

              <div className="sa-form-group">
                <label>Experience Range Max (Years)</label>
                <input
                  type="number"
                  min="0"
                  className="sa-form-control"
                  value={jobForm.exp_max}
                  onChange={(e) => setJobForm({ ...jobForm, exp_max: e.target.value })}
                />
              </div>
            </div>

            <div className="sa-form-group">
              <label>Location Display</label>
              <input
                type="text"
                className="sa-form-control"
                placeholder="e.g. San Francisco, CA"
                value={jobForm.location}
                onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
              />
            </div>

            <div className="sa-checkbox-wrap">
              <input
                type="checkbox"
                id="isRemoteBox"
                checked={jobForm.is_remote}
                onChange={(e) => setJobForm({ ...jobForm, is_remote: e.target.checked })}
              />
              <label htmlFor="isRemoteBox" style={{ cursor: "pointer", fontSize: "0.85rem", color: "#94a3b8" }}>Allows Remote Work Option</label>
            </div>

            <div className="sa-form-actions">
              <button type="button" className="sa-btn sa-btn-secondary" onClick={() => setJobFormOpen(false)}>Cancel</button>
              <button type="submit" className="sa-btn sa-btn-primary">Post Job</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
