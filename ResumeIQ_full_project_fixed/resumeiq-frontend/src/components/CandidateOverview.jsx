import React from "react";

export default function CandidateOverview({
  userName,
  score,
  matchedJobs,
  actionableIssues,
  myApplications,
  hiredCount,
  switchTab,
  jumpToFix,
  openJobModal
}) {
  return (
    <section className="tab-content active">
      <div className="welcome-banner">
        <h1 className="welcome-title">Welcome back, {userName}!</h1>
        <p className="welcome-subtitle">Here is an overview of your resume analytics and job matches.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon icon-blue">📊</div>
          <div className="stat-info">
            <h3>ATS Audit Score</h3>
            <div className="score-display">
              <span className="score-number">{score !== null ? score : "--"}</span>
              <span className="score-total">/100</span>
            </div>
            <div className="stat-bar-track">
              <div className="stat-bar-fill" style={{ width: `${score || 0}%` }}></div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-green">💼</div>
          <div className="stat-info">
            <h3>Matched Jobs</h3>
            <p className="stat-desc">{matchedJobs.length} matches found</p>
            <p className="stat-val">{matchedJobs.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon icon-yellow">⚠️</div>
          <div className="stat-info">
            <h3>Fixes Recommended</h3>
            <p className="stat-desc">Issues affecting scan rate</p>
            <p className="stat-val">{score !== null ? actionableIssues.length : "--"}</p>
          </div>
        </div>
      </div>

      <div className="overview-layout">
        {/* Left Panel: Action Items */}
        <div className="dashboard-panel flex-1">
          <div className="panel-header">
            <h2>Resume Action Items</h2>
            <span className={`badge ${actionableIssues.length > 0 ? "badge-warning" : score !== null ? "badge-success" : ""}`}>
              {score !== null ? (actionableIssues.length > 0 ? `${actionableIssues.length} Pending` : "All Clear") : "0 Pending"}
            </span>
          </div>
          <div className="panel-body">
            {score === null ? (
              <ul className="action-list">
                <li className="empty-state-item">
                  <p>No recommendations yet. Go to <strong>Resume Analyzer</strong> and run a scan to find ways to improve your resume.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => switchTab("analyzer")}>Scan Now</button>
                </li>
              </ul>
            ) : actionableIssues.length > 0 ? (
              <ul className="action-list">
                {actionableIssues.map((issue, idx) => (
                  <li key={idx} className="action-item action-item-clickable" onClick={() => jumpToFix(issue.field)}>
                    <span className={`action-bullet ${issue.type === "danger" ? "action-bullet-danger" : ""}`}>
                      {issue.type === "danger" ? "⛔" : "⚠"}
                    </span>
                    <div className="action-desc">
                      <strong>{issue.title}</strong>
                      <p>{issue.desc}</p>
                    </div>
                    <span className="action-fix-cta">🔧 Fix</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="success-state-item">
                <span className="success-icon">✅</span>
                <p>Your resume looks great! No critical issues found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Matches */}
        <div className="dashboard-panel flex-1">
          <div className="panel-header">
            <h2>Recommended Job Matches</h2>
            {score !== null && matchedJobs.length > 0 && <span className="pulse-dot"></span>}
          </div>
          <div className="panel-body">
            {score === null || matchedJobs.length === 0 ? (
              <div className="jobs-lock-state">
                <div className="jobs-lock-icon">🔒</div>
                <p className="jobs-lock-title">{score === null ? "No job matches yet" : "No matching roles found"}</p>
                <p className="jobs-lock-desc">
                  {score === null
                    ? "First, analyse a resume to unlock personalized, AI-matched job recommendations."
                    : "Add more keywords and skills to your resume to generate job recommendations."}
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => switchTab("analyzer")}>
                  {score === null ? "Analyse Your Resume" : "Upload Resume Again"}
                </button>
              </div>
            ) : (
              <div className="jobs-list">
                {matchedJobs.map((job, idx) => {
                  const pct = Math.min(100, Math.max(0, Math.round(job.match_percent != null ? job.match_percent : 0)));
                  const cls = pct >= 80 ? "text-green" : pct >= 60 ? "text-yellow" : "text-red";
                  const lbl = pct >= 80 ? "Strong Fit" : pct >= 60 ? "Moderate Fit" : "Skills Gap";
                  const barColor = pct >= 80 ? "var(--accent-green)" : pct >= 60 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={idx} className="job-item-card">
                      <div className="job-item-header">
                        <h4>{job.role || job.title}</h4>
                        <span className="job-badge">{job.type}</span>
                      </div>
                      <p className="job-company">{job.company} · <span className="job-loc">{job.location}</span></p>
                      <p className="job-salary">{job.salary}</p>
                      <div className="match-score-row mt-1 mb-1">
                        <div className="match-percentage-badge">
                          <strong>{pct}% Match</strong>
                          <span className={`fit-lbl ${cls}`}>({lbl})</span>
                        </div>
                        <div className="match-bar-track">
                          <div className="match-bar-fill" style={{ width: `${pct}%`, background: barColor }}></div>
                        </div>
                      </div>
                      <div className="skills-map-box mb-1-5">
                        <div className="skills-map-lbl">Skill Overlap:</div>
                        <div className="skills-badges-map-grid">
                          {(job.matched_skills || []).map((s, sIdx) => (
                            <span key={sIdx} className="badge-match-tag match-yes">{s}</span>
                          ))}
                          {(job.matched_skills || []).length === 0 && (
                            <span className="badge-match-tag match-no">No overlapping skills found</span>
                          )}
                        </div>
                      </div>
                      <p className="job-summary-desc">{job.desc}</p>
                      <button className="az-job-new-action-btn" onClick={() => openJobModal(job)} style={{ marginTop: "1rem" }}>
                        View Details & Apply →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: My Applications */}
      <div className="dashboard-panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-header">
          <h2>My Applications</h2>
          {hiredCount > 0 && (
            <span className="badge" style={{ backgroundColor: "#16a34a", color: "#fff" }}>
              🎉 Hired for {hiredCount} role{hiredCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="panel-body">
          {myApplications.length > 0 ? (
            <ul className="action-list" style={{ gap: "0.75rem" }}>
              {myApplications.map((app, idx) => (
                <li key={idx} className={`empty-state-item app-status-item ${app.status === "Hired" ? "app-status-item-hired" : app.status === "Rejected" ? "app-status-item-rejected" : "app-status-item-review"}`}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, textAlign: "left" }}>{app.job_title}</p>
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.82rem", color: "#64748b", textAlign: "left" }}>{app.company_name} • Applied {app.applied_on}</p>
                  </div>
                  <span className={`badge-status ${app.status === "Hired" ? "badge-status-hired" : app.status === "Rejected" ? "badge-status-rejected" : "badge-status-review"}`}>
                    {app.status === "Hired" ? "🎉 You're Hired!" : app.status === "Rejected" ? "Not Selected" : (app.status || "Under Review")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#64748b", padding: "0.5rem 0" }}>You haven't applied to any jobs yet — check out your recommended matches above!</p>
          )}
        </div>
      </div>
    </section>
  );
}
