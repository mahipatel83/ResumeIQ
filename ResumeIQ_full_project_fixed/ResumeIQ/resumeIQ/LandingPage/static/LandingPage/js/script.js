// ResumeIQ Landing Page Script
document.addEventListener("DOMContentLoaded", function () {
    // Client-side interactions for landing page can be added here.
});

// --- Footer Info Modal (Privacy / Terms / Contact / FAQ / GitHub) ---
const FOOTER_INFO_CONTENT = {
    privacy: {
        icon: "bx bx-lock-alt",
        title: "Privacy Policy",
        body: "ResumeIQ only collects the resume data, job details, and account information needed to power AI matching and analytics, and it is never sold to third parties. Recruiters and candidates can request access to or deletion of their stored data at any time. Uploaded resumes are used solely for ATS scoring and job-matching within your account."
    },
    terms: {
        icon: "bx bx-file-blank",
        title: "Terms of Service",
        body: "By using ResumeIQ you agree to provide accurate information and to use the platform only for legitimate hiring and job-seeking activity. Recruiters are responsible for the job posts they publish, and candidates are responsible for the accuracy of the resumes they submit. Misuse of the platform, including spam postings or fraudulent listings, may result in account suspension."
    },
    contact: {
        icon: "bx bx-support",
        title: "Contact Support",
        body: "Need help with your account, a job post, or an application? Reach the ResumeIQ support team at support@resumeiq.app and we'll typically respond within 1–2 business days. For urgent account or billing issues, please include your registered email so we can locate your account quickly."
    },
    faq: {
        icon: "bx bx-help-circle",
        title: "Frequently Asked Questions",
        body: "Common questions cover how ATS scoring works, how to edit or withdraw a job post, and how candidates get notified about application updates. Most answers can be found in the Documentation and How it Works pages, which walk through the resume analysis pipeline and dashboard features step by step. If you can't find what you're looking for there, Contact Support and we'll help directly."
    },
    github: {
        icon: "bx bxl-github",
        title: "GitHub Repository",
        body: "ResumeIQ is an open-source project — the full source code, setup instructions, and documentation live in its GitHub repository. Contributions, bug reports, and feature requests are welcome via issues and pull requests. Check the project's README for the exact repository link and contribution guidelines."
    }
};

function openFooterInfo(key) {
    const data = FOOTER_INFO_CONTENT[key];
    if (!data) return;
    const overlay = document.getElementById("footerInfoOverlay");
    const icon = document.getElementById("footerInfoIcon");
    const title = document.getElementById("footerInfoTitle");
    const body = document.getElementById("footerInfoBody");
    if (!overlay || !icon || !title || !body) return;

    icon.innerHTML = `<i class="${data.icon}"></i>`;
    title.textContent = data.title;
    body.textContent = data.body;
    overlay.classList.add("active");
}

function closeFooterInfo() {
    const overlay = document.getElementById("footerInfoOverlay");
    if (overlay) overlay.classList.remove("active");
}

document.addEventListener("click", function (ev) {
    const overlay = document.getElementById("footerInfoOverlay");
    if (overlay && overlay.classList.contains("active") && ev.target === overlay) {
        closeFooterInfo();
    }
});

document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeFooterInfo();
});