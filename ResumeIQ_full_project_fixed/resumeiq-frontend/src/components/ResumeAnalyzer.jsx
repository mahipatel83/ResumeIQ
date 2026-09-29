import React, { useState } from "react";
import api from "../api/axios";

export default function ResumeAnalyzer({
  atsAnalysis,
  setAtsAnalysis,
  analyzing,
  setAnalyzing,
  fetchDashboardData,
  matchedJobs,
  openJobModal
}) {
  const [analyzerFile, setAnalyzerFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [modelType, setModelType] = useState("rules");

  // =========================================================
  // FILE DRAG AND DROP
  // =========================================================

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const f = e.dataTransfer.files[0];

    if (f) {
      setAnalyzerFile(f);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];

    if (f) {
      setAnalyzerFile(f);
    }
  };

  // =========================================================
  // RUN RESUME ANALYSIS
  // =========================================================

  const runAnalysis = async () => {
    if (!analyzerFile) {
      alert("Please upload a resume file.");
      return;
    }

    setAnalyzing(true);

    const fd = new FormData();

    fd.append("resume_file", analyzerFile);
    fd.append("job_description", "");
    fd.append("model_type", modelType);

    try {
      const res = await api.post(
        "/candidate/analyze-resume/",
        fd,
        {
          withCredentials: true
        }
      );

      console.log("Resume analysis response:", res.data);

      if (res.data.error) {
        throw new Error(res.data.error);
      }

      setAtsAnalysis(res.data);

      // Refresh dashboard data
      await fetchDashboardData();

    } catch (err) {
      console.error("Resume analysis error:", err);

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        let serverMessage = "";

        if (data?.error) {
          serverMessage = `: ${data.error}`;
        }

        alert(
          `Analysis failed. Server returned ${status}${serverMessage}`
        );

      } else if (err.request) {
        alert(
          "Analysis error: Unable to connect to the server. Please check your internet connection and try again."
        );

      } else {
        alert(
          "Analysis error: " + err.message
        );
      }

    } finally {
      setAnalyzing(false);
    }
  };

  // =========================================================
  // RESET ANALYZER
  // =========================================================

  const resetAnalyzer = () => {
    setAnalyzerFile(null);
    setAtsAnalysis(null);
  };

  // =========================================================
  // SCORE COLOR
  // =========================================================

  const getScoreColor = (score) => {
    if (score >= 80) return "#10b981";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <section className="tab-content active">

      {/* =====================================================
          UPLOAD SECTION
      ===================================================== */}

      {!atsAnalysis && (
        <div id="azUploadSection">

          <div className="welcome-banner">
            <h1 className="welcome-title">
              Resume Analyzer
            </h1>

            <p className="welcome-subtitle">
              Upload your resume to get ATS score, keyword analysis,
              strengths, AI suggestions &amp; job recommendations.
            </p>
          </div>

          <div className="az-upload-card">

            <h2>📄 Upload Your Resume</h2>

            <p>
              Supports PDF, DOCX, TXT.
            </p>

            <div
              className={`az-drop-zone ${
                isDragOver ? "drag-over" : ""
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                document.getElementById("azFileInput").click()
              }
            >
              <span className="dz-icon">
                ☁️
              </span>

              <p className="dz-title">
                Drag &amp; drop your resume here
              </p>

              <p className="dz-sub">
                PDF, DOCX, or TXT &nbsp;·&nbsp; Click to browse
              </p>

              {analyzerFile && (
                <div
                  className="az-file-chosen"
                  style={{ display: "flex" }}
                >
                  <span>📎</span>

                  <span>
                    {analyzerFile.name}
                  </span>
                </div>
              )}
            </div>

            <input
              type="file"
              id="azFileInput"
              accept=".pdf,.docx,.doc,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            <button
              className="az-btn-analyze"
              onClick={runAnalysis}
              disabled={!analyzerFile || analyzing}
            >
              {analyzing
                ? "⏳ Analyzing..."
                : "🚀 Analyze My Resume"}
            </button>

          </div>
        </div>
      )}

      {/* =====================================================
          RESULTS SECTION
      ===================================================== */}

      {atsAnalysis && (
        <div id="azResultsSection">

          <button
            className="az-btn-back"
            onClick={resetAnalyzer}
          >
            ← Analyze Another Resume
          </button>

          <div
            className="welcome-banner text-center"
            style={{
              marginBottom: "2rem",
              textAlign: "center"
            }}
          >
            <h1 className="welcome-title">
              <span style={{ color: "var(--az-blue)" }}>
                ✦
              </span>

              {" "}Resume Analysis Results{" "}

              <span style={{ color: "var(--az-blue)" }}>
                ✦
              </span>
            </h1>

            <p className="welcome-subtitle">
              Your resume has been analyzed successfully using{" "}
              <strong>
                {atsAnalysis.model_used ||
                  "NLP & Regex Rules"}
              </strong>
              !
            </p>
          </div>

          {/* =================================================
              TOP ROW
          ================================================= */}

          <div className="az-top-row">

            {/* ATS SCORE */}

            <div className="az-glass-card az-score-card">

              <div className="az-card-header-simple">
                ATS Score
              </div>

              <div className="az-circle-container">

                <svg
                  className="az-circle-svg"
                  width="140"
                  height="140"
                >
                  <circle
                    className="az-circle-bg"
                    cx="70"
                    cy="70"
                    r="60"
                  />

                  <circle
                    className="az-circle-progress"
                    cx="70"
                    cy="70"
                    r="60"
                    strokeDasharray="377"
                    strokeDashoffset={
                      377 -
                      (
                        377 *
                        (
                          (atsAnalysis.ats_score || 0) /
                          100
                        )
                      )
                    }
                    style={{
                      stroke: getScoreColor(
                        atsAnalysis.ats_score || 0
                      )
                    }}
                  />
                </svg>

                <div className="az-circle-text">

                  <span className="az-circle-score">
                    {atsAnalysis.ats_score || 0}
                  </span>

                  <span className="az-circle-total">
                    /100
                  </span>

                </div>
              </div>

              <div
                className="az-score-rating"
                style={{
                  color: getScoreColor(
                    atsAnalysis.ats_score || 0
                  )
                }}
              >
                {atsAnalysis.ats_score >= 80
                  ? "Excellent ★"
                  : atsAnalysis.ats_score >= 60
                  ? "Good Score 👍"
                  : "Needs Work ⚠️"}
              </div>

              <div className="az-score-feedback">
                {atsAnalysis.ats_score >= 80
                  ? "Great job! Your resume is optimized well for ATS systems."
                  : atsAnalysis.ats_score >= 60
                  ? "A few tweaks can push your score significantly higher."
                  : "Key sections or matching keywords are missing. See suggestions."}
              </div>

            </div>

            {/* SCORE BREAKDOWN */}

            <div className="az-glass-card az-breakdown-card">

              <div className="az-card-header-simple">
                Score Breakdown
              </div>

              <div className="az-breakdown-list">

                <div className="az-breakdown-item">

                  <div className="az-breakdown-label">
                    <span>🎯 Skills Match</span>

                    <span>
                      {atsAnalysis.score_breakdown?.skills_match || 0}/40
                    </span>
                  </div>

                  <div className="az-progress-track">
                    <div
                      className="az-progress-fill fill-blue"
                      style={{
                        width: `${
                          (
                            (atsAnalysis.score_breakdown?.skills_match || 0) /
                            40
                          ) * 100
                        }%`
                      }}
                    />
                  </div>

                </div>

                <div className="az-breakdown-item">

                  <div className="az-breakdown-label">
                    <span>🔍 Keyword Match</span>

                    <span>
                      {atsAnalysis.score_breakdown?.keyword_match || 0}/20
                    </span>
                  </div>

                  <div className="az-progress-track">
                    <div
                      className="az-progress-fill fill-cyan"
                      style={{
                        width: `${
                          (
                            (atsAnalysis.score_breakdown?.keyword_match || 0) /
                            20
                          ) * 100
                        }%`
                      }}
                    />
                  </div>

                </div>

                <div className="az-breakdown-item">

                  <div className="az-breakdown-label">
                    <span>📄 Content Quality</span>

                    <span>
                      {atsAnalysis.score_breakdown?.content_quality || 0}/20
                    </span>
                  </div>

                  <div className="az-progress-track">
                    <div
                      className="az-progress-fill fill-purple"
                      style={{
                        width: `${
                          (
                            (atsAnalysis.score_breakdown?.content_quality || 0) /
                            20
                          ) * 100
                        }%`
                      }}
                    />
                  </div>

                </div>

                <div className="az-breakdown-item">

                  <div className="az-breakdown-label">
                    <span>💳 Formatting</span>

                    <span>
                      {atsAnalysis.score_breakdown?.formatting || 0}/10
                    </span>
                  </div>

                  <div className="az-progress-track">
                    <div
                      className="az-progress-fill fill-green"
                      style={{
                        width: `${
                          (
                            (atsAnalysis.score_breakdown?.formatting || 0) /
                            10
                          ) * 100
                        }%`
                      }}
                    />
                  </div>

                </div>

                <div className="az-breakdown-item">

                  <div className="az-breakdown-label">
                    <span>💼 Experience</span>

                    <span>
                      {atsAnalysis.score_breakdown?.experience || 0}/10
                    </span>
                  </div>

                  <div className="az-progress-track">
                    <div
                      className="az-progress-fill fill-yellow"
                      style={{
                        width: `${
                          (
                            (atsAnalysis.score_breakdown?.experience || 0) /
                            10
                          ) * 100
                        }%`
                      }}
                    />
                  </div>

                </div>

              </div>
            </div>

            {/* RESUME SUMMARY */}

            <div className="az-glass-card az-summary-card">

              <div className="az-card-header-simple">
                Resume Summary
              </div>

              <div className="az-summary-list">

                <div className="az-summary-item">
                  <span className="az-summary-icon">
                    👤
                  </span>

                  <div className="az-summary-info">
                    <div className="az-summary-label">
                      Name
                    </div>

                    <div className="az-summary-value">
                      {atsAnalysis.resume_summary?.name || "—"}
                    </div>
                  </div>
                </div>

                <div className="az-summary-item">
                  <span className="az-summary-icon">
                    ✉️
                  </span>

                  <div className="az-summary-info">
                    <div className="az-summary-label">
                      Email
                    </div>

                    <div className="az-summary-value">
                      {atsAnalysis.resume_summary?.email || "—"}
                    </div>
                  </div>
                </div>

                <div className="az-summary-item">
                  <span className="az-summary-icon">
                    📞
                  </span>

                  <div className="az-summary-info">
                    <div className="az-summary-label">
                      Phone
                    </div>

                    <div className="az-summary-value">
                      {atsAnalysis.resume_summary?.phone || "—"}
                    </div>
                  </div>
                </div>

                <div className="az-summary-item">
                  <span className="az-summary-icon">
                    💼
                  </span>

                  <div className="az-summary-info">
                    <div className="az-summary-label">
                      Experience
                    </div>

                    <div className="az-summary-value">
                      {atsAnalysis.resume_summary?.experience || "—"}
                    </div>
                  </div>
                </div>

                <div className="az-summary-item">
                  <span className="az-summary-icon">
                    🔑
                  </span>

                  <div className="az-summary-info">
                    <div className="az-summary-label">
                      Key Skills
                    </div>

                    <div
                      className="az-summary-value"
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--az-blue)"
                      }}
                    >
                      {atsAnalysis.resume_summary?.key_skills || "—"}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* =================================================
              MIDDLE ROW
          ================================================= */}

          <div className="az-mid-row">

            {/* STRENGTHS */}

            <div className="az-glass-card border-green">

              <div className="az-card-title green-text">
                <span className="title-icon">
                  🛡️
                </span>

                Strengths
              </div>

              <ul className="az-check-list green-bullets">
                {(
                  atsAnalysis.strengths || [
                    "Document contains standard headings."
                  ]
                ).map((str, idx) => (
                  <li key={idx}>
                    {str}
                  </li>
                ))}
              </ul>

            </div>

            {/* AREAS TO IMPROVE */}

            <div className="az-glass-card border-yellow">

              <div className="az-card-title yellow-text">
                <span className="title-icon">
                  📈
                </span>

                Areas to Improve
              </div>

              <ul className="az-check-list yellow-bullets">
                {(
                  atsAnalysis.areas_to_improve || [
                    "Add more technical skills."
                  ]
                ).map((imp, idx) => (
                  <li key={idx}>
                    {imp}
                  </li>
                ))}
              </ul>

            </div>

            {/* MISSING SKILLS */}

            <div className="az-glass-card border-red">

              <div className="az-card-title red-text">
                <span className="title-icon">
                  &lt;/&gt;
                </span>

                Missing Skills
              </div>

              <div className="az-badges-grid">

                {(atsAnalysis.missing_keywords || []).map(
                  (skill, idx) => (
                    <span
                      key={idx}
                      className="az-missing-badge"
                    >
                      {skill}
                    </span>
                  )
                )}

                {(atsAnalysis.missing_keywords || []).length === 0 && (
                  <span
                    style={{
                      color: "#10b981",
                      fontSize: "0.8rem",
                      fontWeight: 600
                    }}
                  >
                    ✓ No critical skills missing!
                  </span>
                )}

              </div>

              <div className="az-tip-box">

                <span className="tip-icon">
                  💡
                </span>

                <span className="tip-text">
                  Adding these skills can increase your ATS score by 15% - 20%.
                </span>

              </div>

            </div>

            {/* AI SUGGESTIONS */}

            <div className="az-glass-card border-purple">

              <div className="az-card-title purple-text">
                <span className="title-icon">
                  ✨
                </span>

                AI Suggestions
              </div>

              <ul className="az-arrow-list purple-arrows">
                {(
                  atsAnalysis.ai_suggestions || [
                    "Quantify your experience descriptions."
                  ]
                ).map((sugg, idx) => (
                  <li key={idx}>
                    {sugg}
                  </li>
                ))}
              </ul>

            </div>

          </div>

          {/* =================================================
              JOB RECOMMENDATIONS
          ================================================= */}

          <div className="az-jobs-header">

            <h2 className="welcome-title font-md">

              <span style={{ color: "var(--az-blue)" }}>
                ✦
              </span>

              {" "}TOP JOB RECOMMENDATIONS{" "}

              <span style={{ color: "var(--az-blue)" }}>
                ✦
              </span>

            </h2>

            <p className="welcome-subtitle">
              Based on your resume analysis, these jobs best match your skills and experience.
            </p>

          </div>

          <div className="az-jobs-grid">

            {matchedJobs.map((job, idx) => {

              const logoClasses = [
                "logo-blue",
                "logo-indigo",
                "logo-teal",
                "logo-purple"
              ];

              const logoColorClass =
                logoClasses[idx % logoClasses.length];

              const initials = job.company
                ? job.company
                    .substring(0, 2)
                    .toUpperCase()
                : "JB";

              const matchClass =
                job.match_percent >= 80
                  ? "badge-match-high"
                  : "badge-match-mid";

              return (
                <div
                  key={idx}
                  className="az-job-card-new"
                >

                  <div className="az-job-new-header">

                    <div
                      className={`az-job-logo-box ${logoColorClass}`}
                    >
                      {initials}
                    </div>

                    <div className="az-job-new-meta">

                      <div
                        className="az-job-new-title"
                        title={job.role}
                      >
                        {job.role}
                      </div>

                      <div className="az-job-new-company">
                        {job.company}
                      </div>

                    </div>

                  </div>

                  <div className="az-job-new-loc-row">

                    <span className="az-job-loc-item">
                      📍 {job.location}
                    </span>

                    <span>
                      💼 {job.experience_range}
                    </span>

                  </div>

                  <div className="az-job-new-match-row">

                    <span className="az-job-match-label">
                      Match Score
                    </span>

                    <span
                      className={`az-job-match-badge-circle ${matchClass}`}
                    >
                      {job.match_percent}% Match
                    </span>

                  </div>

                  <div className="az-job-new-tags">

                    {(job.matched_skills || []).map(
                      (skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="az-job-new-tag"
                        >
                          {skill}
                        </span>
                      )
                    )}

                  </div>

                  <button
                    className="az-job-new-action-btn"
                    onClick={() => openJobModal(job)}
                  >
                    View Job Details →
                  </button>

                </div>
              );
            })}

            {matchedJobs.length === 0 && (
              <p
                style={{
                  color: "var(--az-muted)",
                  fontSize: "0.85rem",
                  gridColumn: "1/-1",
                  textAlign: "center"
                }}
              >
                Add more keywords to generate recommended matching roles.
              </p>
            )}

          </div>

          <div className="az-footer-note">
            ★ Keep improving your resume and apply to more jobs to get your dream role!
          </div>

        </div>
      )}

    </section>
  );
}
