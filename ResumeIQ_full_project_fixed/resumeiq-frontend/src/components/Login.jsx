import React, { useState } from "react";
import api from "../api/axios";
import "./Login.css";

// --- Routes (swap these for your router's paths / URL names as needed) ---
const ROUTES = {
  home: "/",
  signup: "/signup",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.post("/login/", { email, password });
      // Dashboards (admin/recruiter/candidate) are still server-rendered
      // Django pages, so this is a full browser navigation — it carries
      // the session cookie the same way a normal form POST redirect would.
      window.location.href = res.data.redirect_url;
    } catch (err) {
      const data = err.response && err.response.data;
      setError((data && data.error) || "Something went wrong. Please try again.");
      if (data && typeof data.email === "string") {
        setEmail(data.email);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="glow-overlay"></div>
      <div className="auth-card">
        <div className="logo-wrap">
          <div className="logo-text">ResumeIQ</div>
        </div>
        <h2>Welcome Back</h2>
        <p className="auth-card-subtitle">Sign in to access your analytics dashboard.</p>

        {error && <div className="error-message">{error}</div>}

        <form
  onSubmit={handleSubmit}
  method="post"
  action="#">
          <div className="form-group">
            <label htmlFor="email">Email or Username</label>
            <input
              type="text"
              id="email"
              name="email"
              placeholder="your email or username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? "Logging In..." : "Log In"}
          </button>
        </form>

        <div className="switch-auth-mode">
          Don't have an account? <a href={ROUTES.signup}>Sign Up</a>
        </div>
        <a href={ROUTES.home} className="back-link">← Back to Home</a>
      </div>
    </div>
  );
}
