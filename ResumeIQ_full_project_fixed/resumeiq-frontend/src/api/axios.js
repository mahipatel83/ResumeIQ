import axios from "axios";

// Points at the Django backend. Override with a Vite env var
// (VITE_API_BASE_URL) for non-default setups/production.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

// accounts login/signup/logout use the Django session cookie, so
// withCredentials is required for the browser to send/store it on these
// cross-origin (different port) requests during local dev.
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;
