import React, { useState } from "react";
import api from "../api/axios";

export default function JobDetailsModal({ isOpen, onClose, job, onSuccess }) {
  const [modalNotifyHired, setModalNotifyHired] = useState(false);
  const [modalStatus, setModalStatus] = useState({ show: false, type: "", text: "" });
  const [applying, setApplying] = useState(false);

  if (!isOpen || !job) return null;

  const applyToJob = async () => {
    if (applying) return;
    if (!job.job_id) {
      setModalStatus({
        show: true,
        type: "info",
        text: "This is a demo listing, so it can't be applied to. Try a real job post from the marketplace."
      });
      return;
    }

    setApplying(true);
    const fd = new FormData();
    fd.append("job_id", job.job_id);
    fd.append("notify_hired", modalNotifyHired ? "true" : "false");

    try {
      const res = await api.post("/candidate/apply-job/", fd);
      if (res.data.error) {
        setModalStatus({ show: true, type: "error", text: res.data.error });
      } else if (res.data.already_applied) {
        setModalStatus({ show: true, type: "info", text: res.data.message });
      } else {
        setModalStatus({ show: true, type: "success", text: res.data.message || "Application submitted successfully!" });
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setModalStatus({ show: true, type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div style={{ display: "flex", position: "fixed", inset: 0, backgroundColor: "rgba(8, 12, 24, 0.65)", zIndex: 999, alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ backgroundColor: "#101827", border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: "16px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto", padding: "1.75rem", position: "relative", boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>✕</button>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.2rem", flexShrink: 0, background: "linear-gradient(135deg, #00d2ff, #0066ff)", color: "#fff" }}>
            {job.company ? job.company.substring(0, 2).toUpperCase() : "JB"}
          </div>
          <div>
            <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: "1.15rem", fontWeight: 800 }}>{job.role || job.title}</h3>
            <p style={{ margin: "0.15rem 0 0", color: "#38bdf8", fontWeight: "600", fontSize: "0.9rem" }}>{job.company}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1rem", fontSize: "0.8rem", color: "#cbd5e1" }}>
          <span style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", padding: "0.3rem 0.7rem", borderRadius: "999px" }}>📍 {job.location}</span>
          <span style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", padding: "0.3rem 0.7rem", borderRadius: "999px" }}>💼 {job.experience_range}</span>
          <span style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", padding: "0.3rem 0.7rem", borderRadius: "999px" }}>🕒 {job.type}</span>
          <span style={{ backgroundColor: "rgba(148, 163, 184, 0.1)", padding: "0.3rem 0.7rem", borderRadius: "999px" }}>💰 {job.salary}</span>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.4rem", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Match Score</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontWeight: 800, color: "#38bdf8", fontSize: "1rem" }}>{job.match_percent || 0}%</span>
            <div style={{ flexGrow: 1, height: "6px", backgroundColor: "rgba(148, 163, 184, 0.15)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #00d2ff, #0066ff)", width: `${job.match_percent || 0}%` }}></div>
            </div>
          </div>
        </div>

        {job.success_probability !== undefined && (
          <div style={{ marginBottom: "1.25rem", padding: "0.85rem 1rem", borderRadius: "12px", backgroundColor: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
            <p style={{ margin: "0 0 0.4rem", color: "#34d399", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>🎯 Interview Probability (ML Predictor)</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontWeight: 800, color: "#10b981", fontSize: "1.1rem" }}>{job.success_probability}% Chance</span>
              <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "4px", backgroundColor: job.success_rating === "High" ? "rgba(16, 185, 129, 0.15)" : (job.success_rating === "Medium" ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)"), color: job.success_rating === "High" ? "#34d399" : (job.success_rating === "Medium" ? "#fbbf24" : "#f87171"), fontWeight: 700 }}>
                {job.success_rating} Fit
              </span>
            </div>
            <p style={{ margin: "0.35rem 0 0", color: "#94a3b8", fontSize: "0.75rem", lineHeight: 1.45 }}>{job.success_message}</p>
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Relevant Skills</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {(job.matched_skills || []).map((s, idx) => (
              <span key={idx} style={{ backgroundColor: "rgba(56, 189, 248, 0.12)", color: "#7dd3fc", padding: "0.25rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600 }}>{s}</span>
            ))}
            {(job.matched_skills || []).length === 0 && (
              <span style={{ color: "#64748b", fontSize: "0.8rem" }}>No matching skills</span>
            )}
          </div>
        </div>

        {job.job_description && (
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 0.5rem", color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>Job Description</p>
            <div 
              style={{ 
                color: "#cbd5e1", 
                fontSize: "0.82rem", 
                lineHeight: 1.55, 
                backgroundColor: "rgba(15, 23, 42, 0.35)", 
                padding: "0.85rem 1rem", 
                borderRadius: "10px", 
                border: "1px solid rgba(148, 163, 184, 0.08)",
                maxHeight: "180px",
                overflowY: "auto",
                whiteSpace: "pre-line"
              }}
            >
              {job.job_description}
            </div>
          </div>
        )}

        <div style={{ backgroundColor: "rgba(56, 189, 248, 0.06)", border: "1px solid rgba(56, 189, 248, 0.18)", borderRadius: "10px", padding: "0.9rem 1rem", marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.4rem", color: "#7dd3fc", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>🔒 Privacy &amp; Application Policy</p>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.8rem", lineHeight: 1.5 }}>
            By applying, your resume, contact details, and ATS score will be shared with the hiring team at {job.company || "this company"} for this role only. Your information is never sold or shared with third parties, and you can withdraw your application at any time from your dashboard.
          </p>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem", color: "#e2e8f0", fontSize: "0.85rem", cursor: "pointer" }}>
          <input type="checkbox" checked={modalNotifyHired} onChange={(e) => setModalNotifyHired(e.target.checked)} style={{ width: "16px", height: "16px", accentColor: "#38bdf8" }} />
          🔔 Notify me by email if I'm hired for this role
        </label>

        {modalStatus.show && (
          <div style={{
            marginBottom: "1rem",
            padding: "0.7rem 0.9rem",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 600,
            backgroundColor: modalStatus.type === "success" ? "rgba(34, 197, 94, 0.12)" : modalStatus.type === "error" ? "rgba(239, 68, 68, 0.12)" : "rgba(148, 163, 184, 0.12)",
            color: modalStatus.type === "success" ? "#4ade80" : modalStatus.type === "error" ? "#f87171" : "#cbd5e1"
          }}>
            {modalStatus.text}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "0.75rem", borderRadius: "8px", border: "1px solid rgba(148, 163, 184, 0.25)", backgroundColor: "transparent", color: "#cbd5e1", fontWeight: 600, cursor: "pointer" }}>Close</button>
          <button disabled={applying || modalStatus.type === "success"} onClick={applyToJob} style={{ flex: 2, padding: "0.75rem", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #00d2ff, #0066ff)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            {applying ? "Submitting..." : modalStatus.type === "success" ? "✓ Applied" : "🚀 Apply Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
