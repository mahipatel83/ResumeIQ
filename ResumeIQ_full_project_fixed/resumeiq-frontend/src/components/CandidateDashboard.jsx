import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./CandidateDashboard.css";
import CandidateOverview from "./CandidateOverview";
import ResumeAnalyzer from "./ResumeAnalyzer";
import ResumeBuilder from "./ResumeBuilder";
import JobDetailsModal from "./JobDetailsModal";

export default function CandidateDashboard() {
  const navigate = useNavigate();

  // Navigation Tabs
  const getTabFromPath = () => {
    const path = window.location.pathname;
    if (path.includes("resume-analysis")) return "analyzer";
    if (path.includes("job-recommendations")) return "builder";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath);

  // Sync state if pathname changes (e.g. back/forward browser buttons)
  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [window.location.pathname]);

  // Dashboard Data State
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [atsAnalysis, setAtsAnalysis] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [hiredCount, setHiredCount] = useState(0);
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Job Details Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Resume Builder Form States (Shared from parent so Analyzer extraction can pre-populate)
  const [personalDetails, setPersonalDetails] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    summary: ""
  });

  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [skillsText, setSkillsText] = useState("");

  // Ref to ResumeBuilder component to invoke field highlighting focus
  const builderRef = useRef(null);

  // Load initial dashboard data from API
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/candidate/api/dashboard/");
      if (res.data) {
        setUserName(res.data.user_name || "User");
        setMyApplications(res.data.my_applications || []);
        setHiredCount(res.data.hired_count || 0);
        setRecruiterJobs(res.data.recruiter_jobs || []);

        // If the user already has a saved ATS analysis in DB, render it
        if (res.data.ats_analysis) {
          setAtsAnalysis(res.data.ats_analysis);
          if (res.data.ats_analysis.job_recommendations) {
            setMatchedJobs(res.data.ats_analysis.job_recommendations);
          }
          // Prepopulate builder form if name/email are extracted
          const summary = res.data.ats_analysis.resume_summary || {};
          setPersonalDetails(prev => ({
            ...prev,
            name: summary.name && summary.name !== "—" ? summary.name : prev.name,
            email: summary.email && summary.email !== "—" ? summary.email : prev.email,
            phone: summary.phone && summary.phone !== "—" ? summary.phone : prev.phone,
            summary: prev.summary, // keep default summary
          }));
          if (summary.key_skills && summary.key_skills !== "—") {
            setSkillsText(summary.key_skills);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching candidate dashboard data:", err);
      if (err.response && err.response.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Sync matched jobs with analysis recommendations
  useEffect(() => {
    if (atsAnalysis && atsAnalysis.job_recommendations) {
      setMatchedJobs(atsAnalysis.job_recommendations);
    } else {
      setMatchedJobs([]);
    }
  }, [atsAnalysis]);

  // Handle Tab Switch
  const switchTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "overview") navigate("/dashboard");
    else if (tabId === "analyzer") navigate("/resume-analysis");
    else if (tabId === "builder") navigate("/job-recommendations");
  };

  // Handle Logout
  const handleLogout = async () => {
    localStorage.clear();
    try {
      const res = await api.post("/logout/");
      window.location.href = res.data.redirect_url || "/login";
    } catch (err) {
      window.location.href = "/login";
    }
  };

  // Overview Action item helper: jumps to Builder tab, focuses and highlights the field
  const jumpToFix = (fieldId) => {
    switchTab("builder");
    if (!fieldId) return;

    setTimeout(() => {
      if (builderRef.current) {
        builderRef.current.focusField(fieldId);
      }
    }, 100);
  };

  // Modal handlers
  const openJobModal = async (job) => {
    setSelectedJob(job);
    setModalOpen(true);

    if (job.job_id) {
      try {
        await api.post(`/candidate/job-view/${job.job_id}/`);
      } catch (err) {
        console.error("Error tracking job view:", err);
      }
    }
  };

  const closeJobModal = () => {
    setModalOpen(false);
    setSelectedJob(null);
  };

  if (loading) {
    return (
      <div className="login-page" style={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="az-spinner"></div>
      </div>
    );
  }

  // Formatting Recommendation calculation
  const allIssues = atsAnalysis?.formatting_issues || [];
  const actionableIssues = allIssues.filter(i => i.type !== "positive");
  const score = atsAnalysis?.ats_score || null;

  return (
    <div style={{ backgroundColor: "var(--bg-darker)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Scanner Scan Overlay */}
      <div className={`az-scan-overlay ${analyzing ? "active" : ""}`}>
        <div className="az-spinner"></div>
        <h3>Analyzing Your Resume...</h3>
        <p>Calculating ATS score, keywords, strengths &amp; job matches</p>
      </div>

      {/* Header / Navigation */}
      <header className="dashboard-header">
        <div className="logo-container" onClick={() => navigate("/")}>
          <div className="logo-text">ResumeIQ</div>
          <span className="badge-role">Job Seeker</span>
        </div>

        <nav className="nav-tabs">
          <button className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => switchTab("overview")}>Dashboard</button>
          <button className={`tab-btn ${activeTab === "analyzer" ? "active" : ""}`} onClick={() => switchTab("analyzer")}>Resume Analyzer</button>
          <button className={`tab-btn ${activeTab === "builder" ? "active" : ""}`} onClick={() => switchTab("builder")}>Resume Builder</button>
        </nav>

        <div className="user-profile">
          <span className="user-name">{userName}</span>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Log Out</button>
        </div>
      </header>

      <main className="dashboard-container">
        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === "overview" && (
          <CandidateOverview
            userName={userName}
            score={score}
            matchedJobs={matchedJobs}
            actionableIssues={actionableIssues}
            myApplications={myApplications}
            hiredCount={hiredCount}
            switchTab={switchTab}
            jumpToFix={jumpToFix}
            openJobModal={openJobModal}
          />
        )}

        {/* ==================== TAB 2: RESUME ANALYZER ==================== */}
        {activeTab === "analyzer" && (
          <ResumeAnalyzer
            atsAnalysis={atsAnalysis}
            setAtsAnalysis={setAtsAnalysis}
            analyzing={analyzing}
            setAnalyzing={setAnalyzing}
            fetchDashboardData={fetchDashboardData}
            matchedJobs={matchedJobs}
            openJobModal={openJobModal}
          />
        )}

        {/* ==================== TAB 3: RESUME BUILDER ==================== */}
        {activeTab === "builder" && (
          <ResumeBuilder
            ref={builderRef}
            personalDetails={personalDetails}
            setPersonalDetails={setPersonalDetails}
            experiences={experiences}
            setExperiences={setExperiences}
            educations={educations}
            setEducations={setEducations}
            projects={projects}
            setProjects={setProjects}
            skillsText={skillsText}
            setSkillsText={setSkillsText}
          />
        )}
      </main>

      {/* ==================== JOB DETAILS MODAL ==================== */}
      <JobDetailsModal
        isOpen={modalOpen}
        onClose={closeJobModal}
        job={selectedJob}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
}
