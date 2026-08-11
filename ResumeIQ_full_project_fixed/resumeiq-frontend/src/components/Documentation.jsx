import React from "react";
import "./LandingPage.css";
import "./Documentation.css";

const ROUTES = {
  home: "/",
  howItWorks: "/how-it-works",
  documentation: "/documentation",
  login: "/login",
  signup: "/signup",
  aiAssistant: "/ai-assistant",
};

export default function Documentation() {
  return (
    <div className="doc-page">
      {/* HEADER */}
      <header>
        <div className="logo-container">
          <a href={ROUTES.home} style={{ textDecoration: "none" }}>
            <div className="logo-text">ResumeIQ</div>
          </a>
        </div>
        <ul className="nav-links">
          <li>
            <a href={ROUTES.home}>Home</a>
          </li>
          <li>
            <a href={ROUTES.howItWorks}>How it Works</a>
          </li>
          <li>
            <a href={ROUTES.documentation} className="active">
              Documentation
            </a>
          </li>
        </ul>
        <div className="auth-buttons">
          <a
            href={ROUTES.login}
            className="btn btn-outline"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Log In
          </a>
          <a
            href={ROUTES.signup}
            className="btn btn-primary"
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}
          >
            Sign Up
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="doc-hero">
        <div className="doc-badge">Documentation</div>
        <h1>
          Quick Reference for <span className="grad">ResumeIQ</span>
        </h1>
        <p>Short, practical guides for every role on the platform.</p>
        <div className="doc-quicknav">
          <a href="#job-seekers">Job Seekers</a>
          <a href="#recruiters">Recruiters</a>
          <a href="#admins">Admins</a>
          <a href="#ai-engine">AI Engine</a>
          <a href="#faq">FAQ</a>
        </div>
      </section>

      {/* CONTENT */}
      <main className="doc-content">
        {/* ROLES + AI ENGINE GRID */}
        <section className="doc-section">
          <div className="doc-grid cols-2">
            {/* JOB SEEKERS */}
            <div className="doc-card-section" id="job-seekers">
              <div className="doc-card-top">
                <div className="doc-icon-wrap">🎯</div>
                <span className="doc-card-number">01</span>
              </div>
              <span className="doc-card-tag">For Candidates</span>
              <h3>Job Seekers</h3>
              <p>
                Upload your resume as <strong>PDF, DOCX, TXT</strong> or pasted text for an instant{" "}
                <strong>ATS score out of 100</strong>.
              </p>
              <div className="doc-tag-row">
                <span className="doc-tag">Strengths &amp; Gaps</span>
                <span className="doc-tag green">One-Click Apply</span>
              </div>
              <details className="doc-details">
                <summary className="doc-card-btn">View Details</summary>
                <ul className="doc-explain">
                  <li>Upload your resume as PDF, DOCX, or TXT for instant parsing.</li>
                  <li>Get an ATS score out of 100 with strengths and skill gaps.</li>
                  <li>Browse jobs and apply in one click with live status tracking.</li>
                </ul>
              </details>
            </div>

            {/* RECRUITERS */}
            <div className="doc-card-section acc-green" id="recruiters">
              <div className="doc-card-top">
                <div className="doc-icon-wrap green">🏢</div>
                <span className="doc-card-number">02</span>
              </div>
              <span className="doc-card-tag">For Hiring Teams</span>
              <h3>Recruiters</h3>
              <p>
                Set up your company profile, connect Gmail, and post jobs with full role details — or save as a
                draft.
              </p>
              <div className="doc-tag-row">
                <span className="doc-tag green">AI Scoring</span>
                <span className="doc-tag green">Direct Email</span>
              </div>
              <details className="doc-details">
                <summary className="doc-card-btn">View Details</summary>
                <ul className="doc-explain">
                  <li>Set up a company profile and connect Gmail for outreach.</li>
                  <li>Review applicants ranked automatically by AI score.</li>
                  <li>Mark candidates Hired or Rejected and email them directly.</li>
                </ul>
              </details>
            </div>

            {/* ADMINS */}
            <div className="doc-card-section acc-purple" id="admins">
              <div className="doc-card-top">
                <div className="doc-icon-wrap purple">🛡️</div>
                <span className="doc-card-number">03</span>
              </div>
              <span className="doc-card-tag">Platform Oversight</span>
              <h3>Admins</h3>
              <p>Manage every user and job posting platform-wide from one control center.</p>
              <div className="doc-tag-row">
                <span className="doc-tag purple">User &amp; Job Mgmt</span>
                <span className="doc-tag purple">DB Explorer</span>
              </div>
              <details className="doc-details">
                <summary className="doc-card-btn">View Details</summary>
                <ul className="doc-explain">
                  <li>Full control over every user account on the platform.</li>
                  <li>Add, edit, or remove job postings from any recruiter.</li>
                  <li>Use the built-in Database Explorer for direct data access.</li>
                </ul>
              </details>
            </div>

            {/* AI ENGINE */}
            <div className="doc-card-section acc-orange" id="ai-engine">
              <div className="doc-card-top">
                <div className="doc-icon-wrap orange">🤖</div>
                <span className="doc-card-number">04</span>
              </div>
              <span className="doc-card-tag">Under The Hood</span>
              <h3>AI Engine</h3>
              <p>
                NLP pipeline detects <strong>50+ skills</strong> and scores resumes across 5 weighted
                dimensions.
              </p>
              <div className="doc-tag-row">
                <span className="doc-tag orange">50+ Skills</span>
                <span className="doc-tag purple">NLTK</span>
              </div>
              <details className="doc-details">
                <summary className="doc-card-btn">View Details</summary>
                <ul className="doc-explain">
                  <li>NLP pipeline automatically detects 50+ industry skills.</li>
                  <li>Scores resumes across 5 weighted dimensions for accuracy.</li>
                  <li>Built on Django, MongoDB, and NLTK under the hood.</li>
                </ul>
              </details>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="doc-section" id="faq">
          <div className="doc-section-label">
            <span className="doc-eyebrow">Quick Answers</span>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="doc-faq-grid">
            <details className="doc-faq" open>
              <summary>Is ResumeIQ free to use?</summary>
              <p>Yes — every role is free, no credit card required.</p>
            </details>

            <details className="doc-faq">
              <summary>Why didn't my PDF parse correctly?</summary>
              <p>Scanned/image-only PDFs have no selectable text. Export a native text-based PDF instead.</p>
            </details>

            <details className="doc-faq">
              <summary>How do recruiters email candidates?</summary>
              <p>Connect a Gmail account in Settings, then email applicants directly from their profile.</p>
            </details>

            <details className="doc-faq">
              <summary>Can I change my account role later?</summary>
              <p>Not self-service yet — contact support and an admin can migrate your account.</p>
            </details>
          </div>
        </section>

        {/* HELP BANNER */}
        <div className="doc-help-banner">
          <div>
            <h4>Still need help?</h4>
            <p>Our support team and AI Assistant are both ready to help.</p>
          </div>
          <div className="doc-help-links">
            <a href={ROUTES.aiAssistant} className="btn btn-primary" style={{ textDecoration: "none" }}>
              ✨ Ask AI Assistant
            </a>
            <a href="#" className="btn btn-outline" style={{ textDecoration: "none" }}>
              Contact Support
            </a>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="footer-content">
          <div className="footer-options">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
            <a href="#faq">FAQ</a>
            <a href="#">GitHub Repository</a>
          </div>
          <div className="copyright">&copy; 2026 ResumeIQ Project. Open Source.</div>
        </div>
      </footer>
    </div>
  );
}
