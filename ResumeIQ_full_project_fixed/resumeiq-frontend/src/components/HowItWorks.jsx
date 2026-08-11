import React, { useState, useEffect, useRef } from "react";
import "./LandingPage.css";
import "./HowItWorks.css";

const ROUTES = {
  home: "/",
  howItWorks: "/how-it-works",
  documentation: "/documentation",
  login: "/login",
  signup: "/signup",
  aiAssistant: "/ai-assistant",
};

const ROLES = ["candidate", "recruiter", "admin"];

const STATS = [
  { target: 50, suffix: "+", label: "Skills Detected by AI" },
  { target: 5, suffix: " Dims", label: "ATS Scoring Dimensions" },
  { target: 3, suffix: " Roles", label: "Platform Roles Supported" },
  { target: 100, suffix: "/100", label: "Max ATS Score Possible" },
];

/** Ported from how_it_works.js animateCounter() — ease-out cubic count-up, triggered on scroll into view. */
function StatCounter({ target, suffix, label }) {
  const [value, setValue] = useState(0);
  const elRef = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    function animate() {
      const duration = 1800;
      const start = performance.now();

      function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(eased * target));
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !animatedRef.current) {
              animatedRef.current = true;
              animate();
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }
    animate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div className="stat-card">
      <div className="stat-number" ref={elRef}>
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** Ported from how_it_works.js scroll-reveal IntersectionObserver on .step-card/.stat-card/.demo-text/.demo-visual */
function useScrollReveal(containerRef, deps) {
  useEffect(() => {
    const container = containerRef.current || document;
    const cards = container.querySelectorAll(".step-card, .stat-card, .demo-text, .demo-visual");

    if (!("IntersectionObserver" in window)) return;

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = "1";
            entry.target.style.transform = "translateY(0)";
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    cards.forEach((card, i) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(24px)";
      card.style.transition = `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s`;
      revealObserver.observe(card);
    });

    return () => revealObserver.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function HowItWorks() {
  const [activeRole, setActiveRole] = useState("candidate");
  const pageRef = useRef(null);

  useScrollReveal(pageRef, [activeRole]);

  return (
    <div className="hiw-page" ref={pageRef}>
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
            <a href={ROUTES.howItWorks} className="active">
              How it Works
            </a>
          </li>
          <li>
            <a href={ROUTES.documentation}>Documentation</a>
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
      <section className="hiw-hero">
        <div className="hiw-badge">How It Works</div>
        <h1>
          From Resume to <span className="grad">Dream Job</span>
          <br />
          in Three Simple Roles
        </h1>
        <p>
          ResumeIQ connects job seekers, recruiters, and administrators on one AI-powered platform.
          Understand how each role works — then jump right in.
        </p>
        <div className="hiw-hero-actions">
          <a href={ROUTES.signup} className="btn btn-primary" style={{ textDecoration: "none" }}>
            Get Started Free
          </a>
          <a href={ROUTES.aiAssistant} className="btn btn-outline" style={{ textDecoration: "none" }}>
            ✨ Try AI Assistant
          </a>
        </div>
      </section>

      {/* ROLE TABS */}
      <div className="role-tabs-section">
        <div className="role-tabs">
          <button
            className={`role-tab${activeRole === "candidate" ? " active" : ""}`}
            data-role="candidate"
            onClick={() => setActiveRole("candidate")}
          >
            <span className="tab-icon">🎯</span> Job Seeker
          </button>
          <button
            className={`role-tab${activeRole === "recruiter" ? " active" : ""}`}
            data-role="recruiter"
            onClick={() => setActiveRole("recruiter")}
          >
            <span className="tab-icon">🏢</span> Recruiter
          </button>
          <button
            className={`role-tab${activeRole === "admin" ? " active" : ""}`}
            data-role="admin"
            onClick={() => setActiveRole("admin")}
          >
            <span className="tab-icon">🛡️</span> Admin
          </button>
        </div>
      </div>

      {/* STEPS SECTION */}
      <section className="steps-section">
        {/* CANDIDATE PANEL */}
        <div className={`role-panel${activeRole === "candidate" ? " active" : ""}`} id="panel-candidate">
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">Step 01</div>
              <div className="step-icon-wrap icon-blue">📝</div>
              <h3>Create Your Account</h3>
              <p>
                Sign up in seconds — choose the <strong>Job Seeker</strong> role, enter your name, email and
                password. No credit card needed.
              </p>
              <div className="step-tags">
                <span className="step-tag">Free</span>
                <span className="step-tag green">Instant Access</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 02</div>
              <div className="step-icon-wrap icon-green">📄</div>
              <h3>Upload Your Resume</h3>
              <p>
                Upload a <strong>PDF, DOCX or TXT</strong> file — or simply paste your resume text. Our
                multi-strategy extractor handles any format.
              </p>
              <div className="step-tags">
                <span className="step-tag">PDF</span>
                <span className="step-tag">DOCX</span>
                <span className="step-tag">TXT</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 03</div>
              <div className="step-icon-wrap icon-purple">🤖</div>
              <h3>AI Analyzes Your Resume</h3>
              <p>
                Our NLP engine scores your resume across <strong>5 dimensions</strong> — Skills Match, Keyword
                Density, Content Quality, Formatting, and Experience — giving you an ATS score out of 100.
              </p>
              <div className="step-tags">
                <span className="step-tag purple">ATS Score</span>
                <span className="step-tag">NLTK</span>
                <span className="step-tag green">50+ Skills</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 04</div>
              <div className="step-icon-wrap icon-orange">💡</div>
              <h3>Get Actionable Insights</h3>
              <p>
                See your detected <strong>strengths</strong>, skills chips, missing keywords, formatting issues,
                and personalised improvement tips — all in one dashboard.
              </p>
              <div className="step-tags">
                <span className="step-tag">Strengths</span>
                <span className="step-tag">Skill Gaps</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 05</div>
              <div className="step-icon-wrap icon-teal">🔍</div>
              <h3>Browse & Apply to Jobs</h3>
              <p>
                Explore recruiter-posted jobs — filtered by title, type, salary, location and experience. Apply
                in <strong>one click</strong>; the recruiter is instantly notified.
              </p>
              <div className="step-tags">
                <span className="step-tag green">One-Click Apply</span>
                <span className="step-tag">Job Board</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 06</div>
              <div className="step-icon-wrap icon-pink">📬</div>
              <h3>Track Your Applications</h3>
              <p>
                Your personal tracker shows live status for every application — <strong>Under Review, Hired</strong>{" "}
                or <strong>Rejected</strong> — updated the moment a recruiter takes action.
              </p>
              <div className="step-tags">
                <span className="step-tag green">Live Status</span>
                <span className="step-tag">Notifications</span>
              </div>
            </div>
          </div>
        </div>

        {/* RECRUITER PANEL */}
        <div className={`role-panel${activeRole === "recruiter" ? " active" : ""}`} id="panel-recruiter">
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">Step 01</div>
              <div className="step-icon-wrap icon-blue">🏢</div>
              <h3>Sign Up as a Recruiter</h3>
              <p>
                Register with the <strong>Recruiter</strong> role and set up your company profile. Add your
                Gmail credentials to enable direct candidate emailing.
              </p>
              <div className="step-tags">
                <span className="step-tag">Company Profile</span>
                <span className="step-tag green">SMTP Ready</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 02</div>
              <div className="step-icon-wrap icon-green">📋</div>
              <h3>Post a Job</h3>
              <p>
                Create a detailed job listing — title, employment type, experience range, location, remote
                toggle, salary range, and required skills. <strong>Save as draft</strong> any time and publish
                when ready.
              </p>
              <div className="step-tags">
                <span className="step-tag">Full-time</span>
                <span className="step-tag">Part-time</span>
                <span className="step-tag">Contract</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 03</div>
              <div className="step-icon-wrap icon-purple">📥</div>
              <h3>Receive Smart Applications</h3>
              <p>
                Every application arrives with the candidate's{" "}
                <strong>ATS score, skill chips, extracted experience, phone and email</strong> — plus
                AI-summarised strengths. No manual screening needed.
              </p>
              <div className="step-tags">
                <span className="step-tag purple">ATS Score</span>
                <span className="step-tag">Skill Chips</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 04</div>
              <div className="step-icon-wrap icon-orange">📑</div>
              <h3>Review Resumes Instantly</h3>
              <p>
                Open the candidate's actual <strong>PDF resume</strong> in one click directly inside your
                browser — no downloads, no waiting.
              </p>
              <div className="step-tags">
                <span className="step-tag">PDF Viewer</span>
                <span className="step-tag green">In-Browser</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 05</div>
              <div className="step-icon-wrap icon-teal">✅</div>
              <h3>Hire, Reject or Email</h3>
              <p>
                Mark candidates as <strong>Hired, Rejected</strong> or <strong>Under Review</strong> — they get
                notified instantly. Send personalised emails directly from your dashboard using Gmail SMTP.
              </p>
              <div className="step-tags">
                <span className="step-tag green">Instant Notify</span>
                <span className="step-tag">Gmail SMTP</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 06</div>
              <div className="step-icon-wrap icon-pink">📊</div>
              <h3>Track Job Performance</h3>
              <p>
                Your dashboard shows total <strong>job views, application counts</strong> and pipeline
                analytics across all your postings so you can optimise each listing.
              </p>
              <div className="step-tags">
                <span className="step-tag">Analytics</span>
                <span className="step-tag purple">View Tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* ADMIN PANEL */}
        <div className={`role-panel${activeRole === "admin" ? " active" : ""}`} id="panel-admin">
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">Step 01</div>
              <div className="step-icon-wrap icon-blue">🛡️</div>
              <h3>Pre-Seeded Admin Account</h3>
              <p>
                The admin account is created by the platform itself — <strong>no public registration</strong>.
                Log in with the seeded credentials to access the full control panel.
              </p>
              <div className="step-tags">
                <span className="step-tag">Secure Access</span>
                <span className="step-tag green">Role-Locked</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 02</div>
              <div className="step-icon-wrap icon-green">👥</div>
              <h3>Manage All Users</h3>
              <p>
                Search, add, edit or delete any user across all roles. Assign company names to recruiters or
                update credentials — all from one centralised panel.
              </p>
              <div className="step-tags">
                <span className="step-tag">CRUD</span>
                <span className="step-tag">Search</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 03</div>
              <div className="step-icon-wrap icon-purple">💼</div>
              <h3>Oversee All Job Listings</h3>
              <p>
                View every job posted on the platform. Add, edit or remove listings, filter by title, company,
                location or recruiter email — total platform control.
              </p>
              <div className="step-tags">
                <span className="step-tag purple">Full CRUD</span>
                <span className="step-tag">Filter</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 04</div>
              <div className="step-icon-wrap icon-orange">📊</div>
              <h3>Platform Analytics Dashboard</h3>
              <p>
                Real-time counters for total users, jobs, drafts, role breakdown (candidates / recruiters), job
                type breakdown (full-time, part-time, contract), and <strong>database health</strong> for both
                MongoDB and SQLite.
              </p>
              <div className="step-tags">
                <span className="step-tag">MongoDB</span>
                <span className="step-tag">SQLite</span>
                <span className="step-tag green">Live Health</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 05</div>
              <div className="step-icon-wrap icon-teal">🗄️</div>
              <h3>Database Explorer</h3>
              <p>
                Browse raw documents from any MongoDB collection or rows from any SQLite table — up to 100
                records per query. Delete individual documents without touching the codebase.
              </p>
              <div className="step-tags">
                <span className="step-tag">Raw Data</span>
                <span className="step-tag purple">Dev Tool</span>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">Step 06</div>
              <div className="step-icon-wrap icon-pink">🧹</div>
              <h3>Draft & Content Cleanup</h3>
              <p>
                Review and delete recruiter drafts that were never published — keeping the database clean and
                performance snappy across the whole platform.
              </p>
              <div className="step-tags">
                <span className="step-tag">Drafts</span>
                <span className="step-tag green">Cleanup</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISUAL DEMO — Candidate ATS */}
      <section className="demo-section">
        <div className="demo-inner">
          <div className="demo-text">
            <div className="section-label">AI Resume Analysis</div>
            <h2>
              Your Resume Score,
              <br />
              Broken Down
            </h2>
            <p>
              Our AI engine parses your resume using NLTK and scores it across 5 weighted dimensions — giving
              you a transparent ATS compatibility score and exactly what to fix.
            </p>
            <ul className="feature-list">
              <li>
                <span className="check">✓</span> Skills Match — 40 pts across 50+ technologies
              </li>
              <li>
                <span className="check">✓</span> Keyword Density — 20 pts for relevant terms
              </li>
              <li>
                <span className="check">✓</span> Content Quality — 20 pts for impact metrics
              </li>
              <li>
                <span className="check">✓</span> Formatting Check — 10 pts for structure
              </li>
              <li>
                <span className="check">✓</span> Experience Score — 10 pts from date ranges
              </li>
            </ul>
          </div>
          <div className="demo-visual">
            <div className="mockup-glow"></div>
            <div className="mockup-frame">
              <svg viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="480" height="320" fill="#090d16" />
                <rect x="0" y="0" width="480" height="44" fill="#131a26" />
                <text x="20" y="27" fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="700">
                  ATS Score Breakdown
                </text>
                <rect x="420" y="12" width="44" height="20" rx="5" fill="rgba(16,185,129,0.15)" />
                <text x="442" y="26" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="10" fontWeight="700">
                  92/100
                </text>
                <path d="M 100 190 A 70 70 0 0 1 244 190" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                <path d="M 100 190 A 70 70 0 0 1 244 190" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" />
                <text x="172" y="183" textAnchor="middle" fill="#f8fafc" fontFamily="sans-serif" fontSize="22" fontWeight="800">
                  92
                </text>
                <text x="172" y="200" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="9">
                  ATS Score
                </text>
                <text x="280" y="72" fill="#94a3b8" fontFamily="sans-serif" fontSize="9" fontWeight="600">
                  DIMENSION SCORES
                </text>
                <text x="280" y="94" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  Skills Match
                </text>
                <rect x="280" y="98" width="140" height="7" rx="3" fill="#1e293b" />
                <rect x="280" y="98" width="126" height="7" rx="3" fill="#38bdf8" />
                <text x="430" y="106" fill="#38bdf8" fontFamily="sans-serif" fontSize="9" fontWeight="700">
                  36/40
                </text>
                <text x="280" y="122" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  Keyword Density
                </text>
                <rect x="280" y="126" width="140" height="7" rx="3" fill="#1e293b" />
                <rect x="280" y="126" width="105" height="7" rx="3" fill="#10b981" />
                <text x="430" y="134" fill="#10b981" fontFamily="sans-serif" fontSize="9" fontWeight="700">
                  15/20
                </text>
                <text x="280" y="150" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  Content Quality
                </text>
                <rect x="280" y="154" width="140" height="7" rx="3" fill="#1e293b" />
                <rect x="280" y="154" width="126" height="7" rx="3" fill="#818cf8" />
                <text x="430" y="162" fill="#818cf8" fontFamily="sans-serif" fontSize="9" fontWeight="700">
                  18/20
                </text>
                <text x="280" y="178" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  Formatting
                </text>
                <rect x="280" y="182" width="140" height="7" rx="3" fill="#1e293b" />
                <rect x="280" y="182" width="112" height="7" rx="3" fill="#f59e0b" />
                <text x="430" y="190" fill="#f59e0b" fontFamily="sans-serif" fontSize="9" fontWeight="700">
                  8/10
                </text>
                <text x="280" y="206" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  Experience
                </text>
                <rect x="280" y="210" width="140" height="7" rx="3" fill="#1e293b" />
                <rect x="280" y="210" width="140" height="7" rx="3" fill="#2dd4bf" />
                <text x="430" y="218" fill="#2dd4bf" fontFamily="sans-serif" fontSize="9" fontWeight="700">
                  10/10
                </text>
                <rect x="20" y="240" width="54" height="18" rx="9" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                <text x="47" y="253" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="8.5" fontWeight="600">
                  Python
                </text>
                <rect x="82" y="240" width="50" height="18" rx="9" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <text x="107" y="253" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="8.5" fontWeight="600">
                  Django
                </text>
                <rect x="140" y="240" width="52" height="18" rx="9" fill="rgba(129,140,248,0.12)" stroke="rgba(129,140,248,0.3)" strokeWidth="1" />
                <text x="166" y="253" textAnchor="middle" fill="#818cf8" fontFamily="sans-serif" fontSize="8.5" fontWeight="600">
                  MongoDB
                </text>
                <rect x="200" y="240" width="44" height="18" rx="9" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
                <text x="222" y="253" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="8.5" fontWeight="600">
                  React
                </text>
                <rect x="252" y="240" width="40" height="18" rx="9" fill="rgba(16,185,129,0.12)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <text x="272" y="253" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="8.5" fontWeight="600">
                  AWS
                </text>
                <rect x="20" y="272" width="440" height="34" rx="6" fill="#131a26" stroke="#223147" strokeWidth="1" />
                <text x="34" y="291" fill="#f59e0b" fontFamily="sans-serif" fontSize="9" fontWeight="700">
                  ⚠ Tip:
                </text>
                <text x="64" y="291" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  Add quantified metrics (e.g. "reduced load time by 40%") to boost Content Quality score.
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* VISUAL DEMO — Recruiter Inbox */}
      <section className="demo-section" style={{ background: "var(--bg-dark)" }}>
        <div className="demo-inner reverse">
          <div className="demo-text">
            <div className="section-label">Recruiter Dashboard</div>
            <h2>
              Smart Applicant
              <br />
              Inbox
            </h2>
            <p>
              Every application comes pre-analysed. Recruiters see ATS scores, detected skills, years of
              experience and AI-extracted strengths — before opening a single resume.
            </p>
            <ul className="feature-list">
              <li>
                <span className="check">✓</span> ATS score visible at a glance
              </li>
              <li>
                <span className="check">✓</span> Skill chips auto-extracted by AI
              </li>
              <li>
                <span className="check">✓</span> One-click PDF resume viewer
              </li>
              <li>
                <span className="check">✓</span> Hire / Reject with instant candidate notification
              </li>
              <li>
                <span className="check">✓</span> Email candidates directly from the panel
              </li>
            </ul>
          </div>
          <div className="demo-visual">
            <div className="mockup-glow"></div>
            <div className="mockup-frame">
              <svg viewBox="0 0 480 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="480" height="300" fill="#090d16" />
                <rect x="0" y="0" width="480" height="44" fill="#131a26" />
                <text x="20" y="27" fill="#94a3b8" fontFamily="sans-serif" fontSize="11" fontWeight="700">
                  Applications Inbox
                </text>
                <rect x="400" y="12" width="64" height="20" rx="5" fill="rgba(56,189,248,0.1)" />
                <text x="432" y="26" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="10" fontWeight="600">
                  3 New
                </text>
                <rect x="16" y="56" width="448" height="68" rx="8" fill="#131a26" stroke="#223147" strokeWidth="1" />
                <circle cx="42" cy="90" r="16" fill="#1e293b" />
                <text x="42" y="95" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="13" fontWeight="700">
                  AK
                </text>
                <text x="68" y="80" fill="#f8fafc" fontFamily="sans-serif" fontSize="11" fontWeight="700">
                  Aarav Kumar
                </text>
                <text x="68" y="96" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  aarav@email.com  ·  3 yrs exp
                </text>
                <rect x="68" y="104" width="38" height="13" rx="6" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
                <text x="87" y="114" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="8">
                  Python
                </text>
                <rect x="112" y="104" width="42" height="13" rx="6" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
                <text x="133" y="114" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="8">
                  Django
                </text>
                <rect x="160" y="104" width="48" height="13" rx="6" fill="rgba(129,140,248,0.1)" stroke="rgba(129,140,248,0.25)" strokeWidth="1" />
                <text x="184" y="114" textAnchor="middle" fill="#818cf8" fontFamily="sans-serif" fontSize="8">
                  MongoDB
                </text>
                <rect x="380" y="72" width="68" height="30" rx="8" fill="rgba(16,185,129,0.12)" />
                <text x="414" y="84" textAnchor="middle" fill="#94a3b8" fontFamily="sans-serif" fontSize="7" fontWeight="600">
                  ATS SCORE
                </text>
                <text x="414" y="98" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="14" fontWeight="800">
                  88
                </text>
                <rect x="16" y="134" width="448" height="68" rx="8" fill="#131a26" stroke="#223147" strokeWidth="1" />
                <circle cx="42" cy="168" r="16" fill="#1e293b" />
                <text x="42" y="173" textAnchor="middle" fill="#818cf8" fontFamily="sans-serif" fontSize="13" fontWeight="700">
                  PS
                </text>
                <text x="68" y="158" fill="#f8fafc" fontFamily="sans-serif" fontSize="11" fontWeight="700">
                  Priya Sharma
                </text>
                <text x="68" y="174" fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                  priya@email.com  ·  5 yrs exp
                </text>
                <rect x="68" y="182" width="36" height="13" rx="6" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.25)" strokeWidth="1" />
                <text x="86" y="192" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="8">
                  React
                </text>
                <rect x="110" y="182" width="32" height="13" rx="6" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
                <text x="126" y="192" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="8">
                  AWS
                </text>
                <rect x="380" y="150" width="68" height="30" rx="8" fill="rgba(56,189,248,0.12)" />
                <text x="414" y="162" textAnchor="middle" fill="#94a3b8" fontFamily="sans-serif" fontSize="7" fontWeight="600">
                  ATS SCORE
                </text>
                <text x="414" y="176" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="14" fontWeight="800">
                  74
                </text>
                <rect x="16" y="216" width="100" height="30" rx="6" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <text x="66" y="235" textAnchor="middle" fill="#10b981" fontFamily="sans-serif" fontSize="10" fontWeight="700">
                  ✓ Hire
                </text>
                <rect x="126" y="216" width="100" height="30" rx="6" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.2)" strokeWidth="1" />
                <text x="176" y="235" textAnchor="middle" fill="#ef4444" fontFamily="sans-serif" fontSize="10" fontWeight="700">
                  ✕ Reject
                </text>
                <rect x="236" y="216" width="110" height="30" rx="6" fill="rgba(56,189,248,0.1)" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
                <text x="291" y="235" textAnchor="middle" fill="#38bdf8" fontFamily="sans-serif" fontSize="10" fontWeight="700">
                  📄 Resume
                </text>
                <rect x="356" y="216" width="108" height="30" rx="6" fill="rgba(129,140,248,0.1)" stroke="rgba(129,140,248,0.2)" strokeWidth="1" />
                <text x="410" y="235" textAnchor="middle" fill="#818cf8" fontFamily="sans-serif" fontSize="10" fontWeight="700">
                  ✉ Email
                </text>
                <text x="16" y="280" fill="#334155" fontFamily="sans-serif" fontSize="9">
                  Showing 2 of 12 applications
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="stats-grid">
          {STATS.map((s) => (
            <StatCounter key={s.label} target={s.target} suffix={s.suffix} label={s.label} />
          ))}
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <section className="compare-section">
        <h2>What Each Role Can Do</h2>
        <p className="sub">A quick side-by-side look at platform capabilities per role.</p>
        <table className="compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Job Seeker</th>
              <th>Recruiter</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Resume Upload &amp; AI Analysis</td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
            </tr>
            <tr>
              <td>Browse Job Board</td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="partial">View own</span>
              </td>
              <td>
                <span className="yes">✓ All</span>
              </td>
            </tr>
            <tr>
              <td>Apply to Jobs</td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
            </tr>
            <tr>
              <td>Post &amp; Manage Jobs</td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="yes">✓ All</span>
              </td>
            </tr>
            <tr>
              <td>View Candidate Resumes</td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="yes">✓ Applicants</span>
              </td>
              <td>
                <span className="yes">✓ All</span>
              </td>
            </tr>
            <tr>
              <td>Email Candidates</td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
            </tr>
            <tr>
              <td>Manage All Users</td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
            </tr>
            <tr>
              <td>Database Explorer</td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="no">— No</span>
              </td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
            </tr>
            <tr>
              <td>AI Assistant (Chatbot)</td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
              <td>
                <span className="yes">✓ Yes</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to Get Started?</h2>
        <p>Join ResumeIQ and let AI do the heavy lifting — from analysing your resume to landing the right job.</p>
        <div className="cta-buttons">
          <a
            href={ROUTES.signup}
            className="btn btn-primary"
            style={{ textDecoration: "none", padding: "0.85rem 2.25rem", fontSize: "1rem" }}
          >
            Create Free Account
          </a>
          <a
            href={ROUTES.aiAssistant}
            className="btn btn-outline"
            style={{ textDecoration: "none", padding: "0.85rem 2.25rem", fontSize: "1rem" }}
          >
            ✨ Try AI Assistant
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-content">
          <div className="footer-options">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
            <a href="#">FAQ</a>
            <a href="#">GitHub Repository</a>
          </div>
          <div className="copyright">&copy; 2026 ResumeIQ Project. Open Source.</div>
        </div>
      </footer>
    </div>
  );
}
