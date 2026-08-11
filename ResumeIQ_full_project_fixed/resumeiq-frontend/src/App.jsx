import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./components/LandingPage";
import AiAssistant from "./components/AiAssistant";
import HowItWorks from "./components/HowItWorks";
import Documentation from "./components/Documentation";
import Login from "./components/Login";
import Signup from "./components/Signup";
import RecruiterDashboard from "./components/RecruiterDashboard";
import CreateJob from "./components/CreateJob";
import RecruiterSettings from "./components/RecruiterSettings";
import CandidateDashboard from "./components/CandidateDashboard";
import SuperadminDashboard from "./components/SuperadminDashboard";

// Example wiring for the converted ResumeIQ pages.
// Adjust paths to match ROUTES in each component if you change them.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/ai-assistant" element={<AiAssistant />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/documentation" element={<Documentation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/recruiter/dashboard" element={<RecruiterDashboard />} />
        <Route path="/recruiter/job/create" element={<CreateJob />} />
        <Route path="/recruiter/job/edit/:jobId" element={<CreateJob />} />
        <Route path="/recruiter/settings" element={<RecruiterSettings />} />
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/dashboard" element={<CandidateDashboard />} />
        <Route path="/resume-analysis" element={<CandidateDashboard />} />
        <Route path="/job-recommendations" element={<CandidateDashboard />} />
        <Route path="/superadmin" element={<SuperadminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

