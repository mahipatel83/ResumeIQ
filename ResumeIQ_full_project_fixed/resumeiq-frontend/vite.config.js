import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Helper function to bypass proxy for HTML page loads (standard browser navigation)
const bypassHtml = (req, res, proxyOptions) => {
  if (req.headers.accept && req.headers.accept.indexOf("html") !== -1) {
    return "/index.html";
  }
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/login": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: bypassHtml,
      },
      "/signup": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: bypassHtml,
      },
      "/logout": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: bypassHtml,
      },
      "/recruiter": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: bypassHtml,
      },
      "/candidate": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: bypassHtml,
      },
      "/admin-panel": {
        target: "http://localhost:8000",
        changeOrigin: true,
        bypass: bypassHtml,
      },
    },
  },
});
