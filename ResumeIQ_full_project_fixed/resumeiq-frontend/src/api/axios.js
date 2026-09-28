import axios from "axios";

// Points at the Django backend.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://resumeiq-myproject.onrender.com";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;
