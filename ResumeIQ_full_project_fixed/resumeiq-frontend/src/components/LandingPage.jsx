import React, { useState, useEffect, useCallback } from "react";
import "./LandingPage.css";

// --- Footer info modal content (ported 1:1 from script.js FOOTER_INFO_CONTENT) ---
const FOOTER_INFO_CONTENT = {
  privacy: {
    icon: "bx bx-lock-alt",
    title: "Privacy Policy",
    body: "ResumeIQ only collects the resume data, job details, and account information needed to power AI matching and analytics, and it is never sold to third parties. Recruiters and candidates can request access to or deletion of their stored data at any time. Uploaded resumes are used solely for ATS scoring and job-matching within your account.",
  },
  terms: {
    icon: "bx bx-file-blank",
    title: "Terms of Service",
    body: "By using ResumeIQ you agree to provide accurate information and to use the platform only for legitimate hiring and job-seeking activity. Recruiters are responsible for the job posts they publish, and candidates are responsible for the accuracy of the resumes they submit. Misuse of the platform, including spam postings or fraudulent listings, may result in account suspension.",
  },
  contact: {
    icon: "bx bx-support",
    title: "Contact Support",
    body: "Need help with your account, a job post, or an application? Reach the ResumeIQ support team at support@resumeiq.app and we'll typically respond within 1–2 business days. For urgent account or billing issues, please include your registered email so we can locate your account quickly.",
  },
  faq: {
    icon: "bx bx-help-circle",
    title: "Frequently Asked Questions",
    body: "Common questions cover how ATS scoring works, how to edit or withdraw a job post, and how candidates get notified about application updates. Most answers can be found in the Documentation and How it Works pages, which walk through the resume analysis pipeline and dashboard features step by step. If you can't find what you're looking for there, Contact Support and we'll help directly.",
  },
  github: {
    icon: "bx bxl-github",
    title: "GitHub Repository",
    body: "ResumeIQ is an open-source project — the full source code, setup instructions, and documentation live in its GitHub repository. Contributions, bug reports, and feature requests are welcome via issues and pull requests. Check the project's README for the exact repository link and contribution guidelines.",
  },
};

// --- Routes (swap these for your router's paths / URL names as needed) ---
const ROUTES = {
  howItWorks: "/how-it-works",
  documentation: "/documentation",
  login: "/login",
  signup: "/signup",
  aiAssistant: "/ai-assistant",
};

export default function LandingPage() {
  const [footerInfoKey, setFooterInfoKey] = useState(null);
  const isFooterInfoOpen = footerInfoKey !== null;
  const activeInfo = footerInfoKey ? FOOTER_INFO_CONTENT[footerInfoKey] : null;

  const openFooterInfo = useCallback((key, e) => {
    if (e) e.preventDefault();
    if (!FOOTER_INFO_CONTENT[key]) return;
    setFooterInfoKey(key);
  }, []);

  const closeFooterInfo = useCallback(() => {
    setFooterInfoKey(null);
  }, []);

  // Close on overlay click (mirrors: click on overlay itself closes modal)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeFooterInfo();
  };

  // Close on Escape key (mirrors document keydown listener)
  useEffect(() => {
    const handleKeyDown = (ev) => {
      if (ev.key === "Escape") closeFooterInfo();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeFooterInfo]);

  return (
    <>
      <header>
        <div className="logo-container">
          <div className="logo-text">ResumeIQ</div>
        </div>

        <ul className="nav-links">
          <li>
            <a href="#" className="active">
              Home
            </a>
          </li>
          <li>
            <a href={ROUTES.howItWorks}>How it Works</a>
          </li>
          <li>
            <a href={ROUTES.documentation}>Documentation</a>
          </li>
        </ul>
        <div className="auth-buttons">
          <a
            href={ROUTES.login}
            className="btn btn-outline"
            id="loginBtn"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Log In
          </a>
          <a
            href={ROUTES.signup}
            className="btn btn-primary"
            id="signupBtn"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Sign Up
          </a>
        </div>
      </header>

      <main className="hero-container">
        <div className="hero-info">
          <h1 className="headline-wrapper">
            <span>Your Resume.</span>
            <span>Smarter Insights.</span>
            <span className="highlight-text">Better Opportunities.</span>
          </h1>

          <p className="main-desc">AI Powered Resume Analyzer and Job Recommendation Platform</p>

          <a href={ROUTES.aiAssistant} className="btn btn-primary btn-cta" id="ctaBtn">
            ✨AI Assistant
          </a>
        </div>

        <div className="hero-visual">
          <div className="glow-effect"></div>
          <svg className="project-img" viewBox="0 0 600 420" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Background */}
            <rect width="600" height="420" rx="14" fill="#131a26" />

            {/* Title bar */}
            <rect x="20" y="20" width="560" height="40" rx="6" fill="#090d16" stroke="#223147" strokeWidth="1" />
            <circle cx="40" cy="40" r="4" fill="#ef4444" />
            <circle cx="52" cy="40" r="4" fill="#f59e0b" />
            <circle cx="64" cy="40" r="4" fill="#10b981" />
            <text x="90" y="44" fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="600">
              ResumeIQ Dashboard
            </text>

            {/* LEFT PANEL */}
            <rect x="20" y="80" width="180" height="320" rx="8" fill="#090d16" stroke="#223147" />
            <text
              x="110"
              y="108"
              textAnchor="middle"
              fill="#94a3b8"
              fontFamily="sans-serif"
              fontSize="10"
              fontWeight="600"
              letterSpacing="1"
            >
              RESUME SCORE
            </text>

            {/*
              Semi-circle gauge centred at (110, 175), radius=55
              Arc from 180° to 0° = left point (55,175) to right point (165,175)
              Background track */}
            <path d="M 55 175 A 55 55 0 0 1 165 175" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
            {/*
              Progress arc: 92% of 180° = ~165.6°
              End point from centre(110,175) at angle (180 - 165.6) = 14.4° from left
              = 110 + 55*cos(14.4°), 175 - 55*sin(14.4°)
              ≈ (163.3, 160.3)  — large-arc=0 because < 180° */}
            <path d="M 55 175 A 55 55 0 0 1 163 161" fill="none" stroke="#10b981" strokeWidth="10" strokeLinecap="round" />

            {/* Score text centred inside the arc */}
            <text x="110" y="168" textAnchor="middle" fill="#ffffff" fontFamily="sans-serif" fontSize="18" fontWeight="bold">
              92/100
            </text>
            <text x="110" y="184" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="9">
              24 Issues Resolved
            </text>

            {/* Checklist items */}
            <text x="36" y="218" fill="#10b981" fontFamily="sans-serif" fontSize="10">
              ✓  ATS Parse Rate
            </text>
            <rect x="152" y="210" width="30" height="8" rx="4" fill="#10b981" opacity="0.25" />

            <text x="36" y="240" fill="#10b981" fontFamily="sans-serif" fontSize="10">
              ✓  Impact Metrics
            </text>
            <rect x="152" y="232" width="30" height="8" rx="4" fill="#10b981" opacity="0.25" />

            <text x="36" y="262" fill="#ef4444" fontFamily="sans-serif" fontSize="10">
              ✕  Redundancy Check
            </text>
            <rect x="152" y="254" width="30" height="8" rx="4" fill="#ef4444" opacity="0.25" />

            <text x="36" y="284" fill="#64748b" fontFamily="sans-serif" fontSize="10">
              ⚿  Typography Sync
            </text>
            <text x="36" y="306" fill="#64748b" fontFamily="sans-serif" fontSize="10">
              ⚿  Index Optimization
            </text>

            {/* RIGHT PANEL */}
            <rect x="215" y="80" width="365" height="320" rx="8" fill="#1c283c" stroke="#223147" />

            {/* CONTENT tab pill — wider to fit text properly */}
            <rect x="228" y="93" width="90" height="22" rx="5" fill="#090d16" stroke="#223147" strokeWidth="1" />
            <text x="273" y="108" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="10" fontWeight="700">
              &#9654; CONTENT
            </text>

            {/* Section title */}
            <text x="228" y="148" fill="#ffffff" fontFamily="sans-serif" fontSize="12" fontWeight="700">
              ATS COMPATIBILITY MATRIX
            </text>

            {/* Text lines */}
            <line x1="228" y1="165" x2="548" y2="165" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <line x1="228" y1="180" x2="490" y2="180" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <line x1="228" y1="195" x2="520" y2="195" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
            <line x1="228" y1="210" x2="460" y2="210" stroke="#334155" strokeWidth="4" strokeLinecap="round" />

            {/* Progress card */}
            <rect x="228" y="228" width="337" height="150" rx="6" fill="#090d16" stroke="#223147" />

            <text x="248" y="250" fill="#94a3b8" fontFamily="sans-serif" fontSize="9" fontWeight="600" letterSpacing="1">
              ATS SCORE BREAKDOWN
            </text>

            {/* Progress bar track + fill */}
            <rect x="248" y="262" width="270" height="8" rx="4" fill="#1e293b" />
            <rect x="248" y="262" width="219" height="8" rx="4" fill="#10b981" />
            {/* Thumb dot at end of fill */}
            <circle cx="467" cy="266" r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
            <text x="480" y="270" fill="#10b981" fontFamily="sans-serif" fontSize="9" fontWeight="700">
              81%
            </text>

            {/* Sub-lines */}
            <line x1="248" y1="292" x2="380" y2="292" stroke="#223147" strokeWidth="5" strokeLinecap="round" />
            <line x1="248" y1="310" x2="440" y2="310" stroke="#223147" strokeWidth="5" strokeLinecap="round" />
            <line x1="248" y1="328" x2="340" y2="328" stroke="#223147" strokeWidth="5" strokeLinecap="round" />
            <line x1="248" y1="346" x2="400" y2="346" stroke="#223147" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      </main>

      <footer>
        <div className="footer-content">
          <div className="footer-options">
            <a href="#" onClick={(e) => openFooterInfo("privacy", e)}>
              Privacy Policy
            </a>
            <a href="#" onClick={(e) => openFooterInfo("terms", e)}>
              Terms of Service
            </a>
            <a href="#" onClick={(e) => openFooterInfo("contact", e)}>
              Contact Support
            </a>
            <a href="#" onClick={(e) => openFooterInfo("faq", e)}>
              FAQ
            </a>
            <a href="#" onClick={(e) => openFooterInfo("github", e)}>
              GitHub Repository
            </a>
          </div>
          <div className="copyright">&copy; 2026 ResumeIQ Project. Open Source.</div>
        </div>
      </footer>

      {/* Footer Info Modal */}
      <div
        className={`footer-info-overlay${isFooterInfoOpen ? " active" : ""}`}
        id="footerInfoOverlay"
        onClick={handleOverlayClick}
      >
        <div className="footer-info-modal">
          <button className="footer-info-close" onClick={closeFooterInfo} aria-label="Close">
            &times;
          </button>
          <div className="footer-info-icon" id="footerInfoIcon">
            <i className={activeInfo ? activeInfo.icon : "bx bx-info-circle"}></i>
          </div>
          <h3 id="footerInfoTitle">{activeInfo ? activeInfo.title : ""}</h3>
          <p id="footerInfoBody">{activeInfo ? activeInfo.body : ""}</p>
        </div>
      </div>
    </>
  );
}
