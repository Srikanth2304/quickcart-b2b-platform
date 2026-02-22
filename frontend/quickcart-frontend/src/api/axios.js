import axios from "axios";
import { showToast } from "../utils/notify";

/* ── Configuration ── */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
const TIMEOUT_MS = 20000; // 20 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

/* ── Request Interceptor ── */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Tag retry metadata
    if (config._retryCount === undefined) {
      config._retryCount = 0;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response Interceptor ── */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    // 401 / 403 → Session expired → force logout
    if (error.response?.status === 401 || error.response?.status === 403) {
      const isLoginRequest = (config.url || "").includes("/auth/login");
      if (!isLoginRequest) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("email");
        showToast("Session expired. Please log in again.", "error");
        // Small delay so the toast is visible before redirect
        setTimeout(() => {
          window.location.href = "/login";
        }, 1200);
        return Promise.reject(error);
      }
    }

    // Retry logic for transient failures on safe (idempotent) methods
    const method = (config.method || "").toLowerCase();
    const isRetryable = RETRYABLE_METHODS.has(method);
    const isTransient =
      !error.response || // network error
      error.code === "ECONNABORTED" || // timeout
      (error.response?.status >= 500 && error.response?.status < 600);

    if (isRetryable && isTransient && (config._retryCount || 0) < MAX_RETRIES) {
      config._retryCount = (config._retryCount || 0) + 1;
      const delay = RETRY_DELAY_MS * config._retryCount; // linear backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
