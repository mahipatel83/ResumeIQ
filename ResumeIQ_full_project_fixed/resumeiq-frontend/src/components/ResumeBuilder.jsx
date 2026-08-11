import React, { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { jsPDF } from "jspdf";

const ResumeBuilder = forwardRef(({
  personalDetails,
  setPersonalDetails,
  experiences,
  setExperiences,
  educations,
  setEducations,
  projects,
  setProjects,
  skillsText,
  setSkillsText
}, ref) => {
  const [wizardStep, setWizardStep] = useState(0);
  const [themeClass, setThemeClass] = useState("classic-theme");

  const fieldRefs = {
    bName: useRef(null),
    bTitle: useRef(null),
    bEmail: useRef(null),
    bPhone: useRef(null),
    bLocation: useRef(null),
    bWebsite: useRef(null),
    bSummary: useRef(null),
    bSkills: useRef(null),
  };

  useImperativeHandle(ref, () => ({
    focusField(fieldId) {
      if (!fieldId) return;

      if (["bName", "bTitle", "bEmail", "bPhone", "bLocation", "bWebsite", "bSummary"].includes(fieldId)) {
        setWizardStep(0);
      } else if (fieldId === "bSkills") {
        setWizardStep(3);
      }

      setTimeout(() => {
        const targetRef = fieldRefs[fieldId];
        if (targetRef && targetRef.current) {
          targetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          targetRef.current.focus({ preventScroll: true });
          targetRef.current.classList.add("field-needs-fix");
          setTimeout(() => targetRef.current.classList.remove("field-needs-fix"), 2200);
        }
      }, 200);
    }
  }));

  const showStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < 5) {
      setWizardStep(stepIndex);
    }
  };

  const nextStep = () => {
    if (wizardStep < 4) {
      setWizardStep(wizardStep + 1);
    } else {
      alert("Congratulations! You have completed all sections of the resume builder. You can now download the PDF resume.");
    }
  };

  const prevStep = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    }
  };

  const resetBuilderForm = () => {
    if (window.confirm("Clear the builder?")) {
      setPersonalDetails({
        name: "",
        title: "",
        email: "",
        phone: "",
        location: "",
        website: "",
        summary: ""
      });
      setExperiences([]);
      setEducations([]);
      setProjects([]);
      setSkillsText("");
      setWizardStep(0);
    }
  };

  // Dynamic Add / Remove items in Builder
  const addExperience = () => {
    setExperiences([...experiences, { title: "", company: "", date: "", desc: "" }]);
  };

  const removeExperience = (idx) => {
    setExperiences(experiences.filter((_, i) => i !== idx));
  };

  const updateExperience = (idx, field, value) => {
    const updated = [...experiences];
    updated[idx][field] = value;
    setExperiences(updated);
  };

  const addEducation = () => {
    setEducations([...educations, { degree: "", school: "", date: "", gpa: "" }]);
  };

  const removeEducation = (idx) => {
    setEducations(educations.filter((_, i) => i !== idx));
  };

  const updateEducation = (idx, field, value) => {
    const updated = [...educations];
    updated[idx][field] = value;
    setEducations(updated);
  };

  const addProject = () => {
    setProjects([...projects, { title: "", link: "", desc: "" }]);
  };

  const removeProject = (idx) => {
    setProjects(projects.filter((_, i) => i !== idx));
  };

  const updateProject = (idx, field, value) => {
    const updated = [...projects];
    updated[idx][field] = value;
    setProjects(updated);
  };

  // Generate & Download PDF by capturing the preview DOM (preserves colors, fonts, and layout)
  const downloadResume = async () => {
    const btn = document.getElementById("downloadBtn");
    if (btn) btn.disabled = true;

    try {
      const el = document.getElementById("resumeCanvas");
      if (!el) throw new Error("Preview element not found (#resumeCanvas)");

      // Wait for webfonts to be ready so text renders correctly in the capture
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Dynamically import html2canvas to avoid adding runtime cost if not needed
      const html2canvas = (await import('html2canvas')).default;

      // Capture at higher scale for better print quality
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');

      // Use jsPDF in pixel units and set page size to the canvas size so the visual matches exactly
      const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      const filename = `${(personalDetails.name || 'resume').replace(/\s+/g, '_')}_Resume.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error("PDF error:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  return (
    <section className="tab-content active">
      <div className="builder-layout">
        {/* Left Panel: Form Wizard */}
        <div className="builder-form-panel">
          <h2>Resume Builder</h2>
          <p className="section-desc">Fill out your details. The preview on the right updates instantly.</p>

          {/* Progress Indicator */}
          <div className="wizard-header">
            <div className="wizard-progress-bar-container">
              <div className="wizard-progress-bar" style={{ width: `${((wizardStep + 1) / 5) * 100}%` }}></div>
            </div>
            <div className="wizard-steps-indicator">
              {[
                { step: 0, label: "Personal Info" },
                { step: 1, label: "Experience" },
                { step: 2, label: "Education" },
                { step: 3, label: "Skills" },
                { step: 4, label: "Projects" }
              ].map((n) => (
                <div
                  key={n.step}
                  className={`wizard-step-node ${wizardStep === n.step ? "active" : wizardStep > n.step ? "completed" : ""}`}
                  onClick={() => showStep(n.step)}
                >
                  <span className="step-num">{n.step + 1}</span>
                  <span className="step-label">{n.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Step 0: Personal Details */}
          {wizardStep === 0 && (
            <div className="builder-section active">
              <div className="step-title">Personal Details</div>
              <div className="form-grid">
                <div className="form-group col-6">
                  <label className="form-label-bold">Full Name</label>
                  <input
                    type="text"
                    ref={fieldRefs.bName}
                    value={personalDetails.name}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, name: e.target.value })}
                    placeholder="John Doe"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div className="form-group col-6">
                  <label className="form-label-bold">Professional Title</label>
                  <input
                    type="text"
                    ref={fieldRefs.bTitle}
                    value={personalDetails.title}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, title: e.target.value })}
                    placeholder="Senior Software Engineer"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div className="form-group col-4">
                  <label className="form-label-bold">Email</label>
                  <input
                    type="email"
                    ref={fieldRefs.bEmail}
                    value={personalDetails.email}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, email: e.target.value })}
                    placeholder="john@example.com"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div className="form-group col-4">
                  <label className="form-label-bold">Phone</label>
                  <input
                    type="text"
                    ref={fieldRefs.bPhone}
                    value={personalDetails.phone}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div className="form-group col-4">
                  <label className="form-label-bold">Location</label>
                  <input
                    type="text"
                    ref={fieldRefs.bLocation}
                    value={personalDetails.location}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, location: e.target.value })}
                    placeholder="San Francisco, CA"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div className="form-group col-12">
                  <label className="form-label-bold">LinkedIn / Portfolio Link</label>
                  <input
                    type="text"
                    ref={fieldRefs.bWebsite}
                    value={personalDetails.website}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, website: e.target.value })}
                    placeholder="linkedin.com/in/johndoe"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div className="form-group col-12">
                  <label className="form-label-bold">Professional Summary</label>
                  <textarea
                    ref={fieldRefs.bSummary}
                    value={personalDetails.summary}
                    onChange={(e) => setPersonalDetails({ ...personalDetails, summary: e.target.value })}
                    placeholder="Write a summary about your skills and experience..."
                  ></textarea>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Experience */}
          {wizardStep === 1 && (
            <div className="builder-section active">
              <div className="step-title">Work Experience</div>
              <div style={{ padding: "1.25rem" }}>
                {experiences.map((exp, idx) => (
                  <div key={idx} className="experience-card form-grid">
                    <div className="form-group col-6">
                      <label className="form-label-bold">Job Title</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExperience(idx, "title", e.target.value)}
                        placeholder="Software Engineer"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label className="form-label-bold">Company</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(idx, "company", e.target.value)}
                        placeholder="Google"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label className="form-label-bold">Start / End Date</label>
                      <input
                        type="text"
                        value={exp.date}
                        onChange={(e) => updateExperience(idx, "date", e.target.value)}
                        placeholder="Jan 2024 - Present"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-12">
                      <label className="form-label-bold">Job Description</label>
                      <textarea
                        value={exp.desc}
                        onChange={(e) => updateExperience(idx, "desc", e.target.value)}
                        placeholder="Describe achievements, duties, tools used..."
                      ></textarea>
                    </div>
                    <button className="btn btn-outline btn-xs remove-btn" onClick={() => removeExperience(idx)}>Remove</button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm mt-1" onClick={addExperience}>+ Add Work Experience</button>
              </div>
            </div>
          )}

          {/* Step 2: Education */}
          {wizardStep === 2 && (
            <div className="builder-section active">
              <div className="step-title">Education</div>
              <div style={{ padding: "1.25rem" }}>
                {educations.map((edu, idx) => (
                  <div key={idx} className="education-card form-grid">
                    <div className="form-group col-6">
                      <label className="form-label-bold">Degree &amp; Major</label>
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, "degree", e.target.value)}
                        placeholder="B.S. in Computer Science"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label className="form-label-bold">School / University</label>
                      <input
                        type="text"
                        value={edu.school}
                        onChange={(e) => updateEducation(idx, "school", e.target.value)}
                        placeholder="Stanford University"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label className="form-label-bold">Dates attended</label>
                      <input
                        type="text"
                        value={edu.date}
                        onChange={(e) => updateEducation(idx, "date", e.target.value)}
                        placeholder="2018 - 2022"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label className="form-label-bold">GPA / Achievements (Optional)</label>
                      <input
                        type="text"
                        value={edu.gpa}
                        onChange={(e) => updateEducation(idx, "gpa", e.target.value)}
                        placeholder="GPA 3.8 / Honors"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <button className="btn btn-outline btn-xs remove-btn" onClick={() => removeEducation(idx)}>Remove</button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm mt-1" onClick={addEducation}>+ Add Education</button>
              </div>
            </div>
          )}

          {/* Step 3: Skills */}
          {wizardStep === 3 && (
            <div className="builder-section active">
              <div className="step-title">Skills &amp; Core Competencies</div>
              <div className="form-grid">
                <div className="form-group col-12">
                  <label className="form-label-bold">Skills (comma-separated)</label>
                  <input
                    type="text"
                    ref={fieldRefs.bSkills}
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="Python, JavaScript, SQL, React, Git, Project Management"
                    style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Projects */}
          {wizardStep === 4 && (
            <div className="builder-section active">
              <div className="step-title">Key Projects</div>
              <div style={{ padding: "1.25rem" }}>
                {projects.map((proj, idx) => (
                  <div key={idx} className="project-card form-grid">
                    <div className="form-group col-6">
                      <label className="form-label-bold">Project Title</label>
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) => updateProject(idx, "title", e.target.value)}
                        placeholder="E-Commerce API"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-6">
                      <label className="form-label-bold">Project Link / Tech Stack</label>
                      <input
                        type="text"
                        value={proj.link}
                        onChange={(e) => updateProject(idx, "link", e.target.value)}
                        placeholder="GitHub / Python, Django"
                        style={{ width: "100%", padding: "0.6rem", background: "var(--bg-darker)", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                      />
                    </div>
                    <div className="form-group col-12">
                      <label className="form-label-bold">Project Description</label>
                      <textarea
                        value={proj.desc}
                        onChange={(e) => updateProject(idx, "desc", e.target.value)}
                        placeholder="Detail your role and key accomplishments..."
                      ></textarea>
                    </div>
                    <button className="btn btn-outline btn-xs remove-btn" onClick={() => removeProject(idx)}>Remove</button>
                  </div>
                ))}
                <button className="btn btn-outline btn-sm mt-1" onClick={addProject}>+ Add Project</button>
              </div>
            </div>
          )}

          {/* Wizard Navigation */}
          <div className="wizard-navigation">
            <button className="btn btn-outline" style={{ display: wizardStep === 0 ? "none" : "inline-block" }} onClick={prevStep}>← Back</button>
            <button className="btn btn-outline" onClick={resetBuilderForm}>Reset Form</button>
            <button className="btn btn-primary" onClick={nextStep}>{wizardStep === 4 ? "Finish ✓" : "Next →"}</button>
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="builder-preview-panel">
          <div className="preview-toolbar">
            <div className="template-selector">
              <span className="label">Template:</span>
              <button className={`tpl-btn ${themeClass === "classic-theme" ? "active" : ""}`} onClick={() => setThemeClass("classic-theme")}>Classic</button>
              <button className={`tpl-btn ${themeClass === "modern-theme" ? "active" : ""}`} onClick={() => setThemeClass("modern-theme")}>Modern</button>
              <button className={`tpl-btn ${themeClass === "creative-theme" ? "active" : ""}`} onClick={() => setThemeClass("creative-theme")}>Creative</button>
            </div>
            <button className="btn btn-primary" id="downloadBtn" onClick={downloadResume}>⬇️ Download PDF</button>
          </div>

          <div className="resume-scroll-container">
            <div className="resume-scale-wrapper">
              <div id="resumeCanvas" className={`resume-canvas ${themeClass}`}>
                {/* Theme Header */}
                <div className="resume-header">
                  <h1 className="p-name">{personalDetails.name || "YOUR NAME"}</h1>
                  <p className="p-title">{personalDetails.title || "PROFESSIONAL TITLE"}</p>
                  <div className="p-contacts">
                    <span>{personalDetails.email || "email@domain.com"}</span> |&nbsp;
                    <span>{personalDetails.phone || "+1 (555) 000-0000"}</span> |&nbsp;
                    <span>{personalDetails.location || "City, Country"}</span>
                  </div>
                  {personalDetails.website && (
                    <div className="p-website">{personalDetails.website}</div>
                  )}
                </div>

                {/* Theme Layout body */}
                <div className="resume-content-layout">
                  <div className="resume-main-col">
                    {personalDetails.summary && (
                      <div className="resume-sect">
                        <h2 className="sect-heading">Professional Summary</h2>
                        <p className="item-desc" style={{ fontSize: "9.2pt" }}>{personalDetails.summary}</p>
                      </div>
                    )}

                    {experiences.length > 0 && (
                      <div className="resume-sect">
                        <h2 className="sect-heading">Experience</h2>
                        <div>
                          {experiences.map((exp, idx) => (
                            <div key={idx} className="preview-item">
                              <div className="preview-item-header">
                                <strong className="item-title">{exp.title || "Job Title"}</strong>
                                <span className="item-meta">{exp.company || "Company"} | {exp.date || "Date"}</span>
                              </div>
                              <p className="item-desc">{exp.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {projects.length > 0 && (
                      <div className="resume-sect">
                        <h2 className="sect-heading">Projects</h2>
                        <div>
                          {projects.map((proj, idx) => (
                            <div key={idx} className="preview-item">
                              <div className="preview-item-header">
                                <strong className="item-title">{proj.title || "Project"}</strong>
                                <span className="item-meta">{proj.link || ""}</span>
                              </div>
                              <p className="item-desc">{proj.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="resume-side-col">
                    {skillsText && (
                      <div className="resume-sect">
                        <h2 className="sect-heading">Skills</h2>
                        <div className="skills-badges">
                          {skillsText.split(",").map((s, idx) => s.trim() && (
                            <span key={idx}>{s.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {educations.length > 0 && (
                      <div className="resume-sect">
                        <h2 className="sect-heading">Education</h2>
                        <div>
                          {educations.map((edu, idx) => (
                            <div key={idx} className="preview-item">
                              <div className="preview-item-header">
                                <strong className="item-title">{edu.degree || "Degree"}</strong>
                              </div>
                              <div className="edu-meta-row">{edu.school || "School"}</div>
                              <div className="edu-meta-row">{edu.date || "Date"} {edu.gpa ? ` | ${edu.gpa}` : ""}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

export default ResumeBuilder;
