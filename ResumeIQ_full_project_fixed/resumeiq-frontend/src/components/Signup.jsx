import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Signup.css";

// --- Routes (swap these for your router's paths / URL names as needed) ---
const ROUTES = {
  home: "/",
  login: "/login",
};

export default function Signup() {
  const navigate = useNavigate();

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Requirements check
  const requirements = {
    minChar: password.length >= 8 && password.length <= 16,
    twoUpper: (password.match(/[A-Z]/g) || []).length >= 2,
    oneLower: (password.match(/[a-z]/g) || []).length >= 1,
    twoNumber: (password.match(/[0-9]/g) || []).length >= 2,
    oneSpecial: (password.match(/[^A-Za-z0-9]/g) || []).length >= 1,
  };

  const getStrength = () => {
    if (!password) return "";
    const metCount = Object.values(requirements).filter(Boolean).length;
    if (metCount <= 2) return "Weak";
    if (metCount <= 4) return "Medium";
    return "Strong";
  };

  const strength = getStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.post("/signup/", { fullname, email, password, role });
      // Matches the original Django view, which redirected straight to
      // the login page after a successful signup.
      navigate(ROUTES.login);
    } catch (err) {
      const data = err.response && err.response.data;
      setError((data && data.error) || "Something went wrong. Please try again.");
      const values = data && data.values;
      if (values) {
        setFullname(values.fullname || "");
        setEmail(values.email || "");
        setRole(values.role || "");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="glow-overlay"></div>
      
      <div className="auth-card">
        <div className="logo-wrap">
          <div className="logo-text">ResumeIQ</div>
        </div>
        <h2>Create Account</h2>
        <p className="auth-card-subtitle">Get started with your free analytics account today.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullname">Full Name</label>
            <input
              type="text"
              id="fullname"
              name="fullname"
              placeholder="John Doe"
              required
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="name@domain.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>

          {/* Embedded Password Generator Section */}
          <div className="password-generator-section">
            {password && (
              <div className="strength-inline-wrapper">
                <div className="strength-inline-header">
                  <span className="strength-inline-label">Strength:</span>
                  <span className={`strength-inline-badge ${strength.toLowerCase()}`}>{strength}</span>
                </div>
                <div className="strength-inline-bar-track">
                  <div className={`strength-inline-bar-fill ${strength.toLowerCase()}`} />
                </div>
              </div>
            )}

            <div className="requirements-inline-section">
              <span className="requirements-inline-title">Requirements:</span>
              <ul className="req-inline-list">
                <li className={requirements.minChar ? "met" : "unmet"}>
                  <span className="req-inline-bullet">{requirements.minChar ? "✓" : "○"}</span>
                  Minimum 8 characters and maximum 16 characters
                </li>
                <li className={requirements.twoUpper ? "met" : "unmet"}>
                  <span className="req-inline-bullet">{requirements.twoUpper ? "✓" : "○"}</span>
                  At least 2 uppercase letters
                </li>
                <li className={requirements.oneLower ? "met" : "unmet"}>
                  <span className="req-inline-bullet">{requirements.oneLower ? "✓" : "○"}</span>
                  At least 1 lowercase letter
                </li>
                <li className={requirements.twoNumber ? "met" : "unmet"}>
                  <span className="req-inline-bullet">{requirements.twoNumber ? "✓" : "○"}</span>
                  At least 2 numbers
                </li>
                <li className={requirements.oneSpecial ? "met" : "unmet"}>
                  <span className="req-inline-bullet">{requirements.oneSpecial ? "✓" : "○"}</span>
                  At least 1 special character
                </li>
              </ul>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "1.5rem" }}>
            <label htmlFor="role">Select Your Role</label>
            <select id="role" name="role" required value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="customer">Job Seeker (customer)</option>
              <option value="recruiter">Recruiter (company)</option>
            </select>
          </div>
          
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        <div className="switch-auth-mode">
          Already have an account? <a href={ROUTES.login}>Log In</a>
        </div>
        <a href={ROUTES.home} className="back-link">← Back to Home</a>
      </div>

    </div>
  );
}
