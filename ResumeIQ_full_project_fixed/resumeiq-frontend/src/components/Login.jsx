import React, { useState } from "react";
import api from "../api/axios";
import "./Login.css";

const ROUTES = {
  home: "/",
  signup: "/signup",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      const response = await api.post(
        "/login/",
        {
          email: email.trim(),
          password: password,
        },
        {
          withCredentials: true,
        }
      );

      console.log("Login response:", response.data);

      if (response.data.success && response.data.redirect_url) {
        window.location.href = response.data.redirect_url;
        return;
      }

      setError("Login successful, but dashboard URL was not received.");
    } catch (err) {
      console.error("Login error:", err);

      if (err.response) {
        const data = err.response.data;

        setError(
          data?.error ||
            `Login failed. Server returned ${err.response.status}.`
        );

        if (typeof data?.email === "string") {
          setEmail(data.email);
        }
      } else if (err.request) {
        setError(
          "Unable to connect to the server. Please check your internet connection and try again."
        );
      } else {
        setError("Something went wrong. Please try again.");
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

        <p className="auth-card-subtitle">
          Sign in to access your analytics dashboard.
        </p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              Email or Username
            </label>

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
            <label htmlFor="password">
              Password
            </label>

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

          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? "Logging In..." : "Log In"}
          </button>
        </form>

        <div className="switch-auth-mode">
          Don't have an account?{" "}
          <a href={ROUTES.signup}>Sign Up</a>
        </div>

        <a href={ROUTES.home} className="back-link">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
