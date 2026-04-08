import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext();

/* ── Safe JWT helpers ── */

/** Decode a JWT payload without throwing. Returns null on failure. */
function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // JWT uses Base64URL — replace URL-safe chars and pad
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Check if a token is expired (with 60s buffer). */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true; // no exp claim → treat as expired
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp < nowSec + 60; // 60s safety buffer
}

/** Extract role from JWT payload. */
function getRoleFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const normalizeRole = (value) => {
    if (typeof value !== "string") return null;
    return value.replace(/^ROLE_/, "").toUpperCase();
  };

  // Support common claim shapes
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    return normalizeRole(payload.roles[0]);
  }
  if (typeof payload.role === "string") return normalizeRole(payload.role);
  if (Array.isArray(payload.authorities) && payload.authorities.length > 0) {
    const auth = payload.authorities[0];
    if (typeof auth === "string") return normalizeRole(auth);
    return normalizeRole(auth?.authority);
  }
  return null;
}

function extractTokenFromResponse(responseData) {
  if (!responseData || typeof responseData !== "object") return null;
  if (typeof responseData.token === "string") return responseData.token;
  if (typeof responseData?.data?.token === "string") return responseData.data.token;
  if (typeof responseData?.accessToken === "string") return responseData.accessToken;
  if (typeof responseData?.data?.accessToken === "string") return responseData.data.accessToken;
  if (typeof responseData?.jwt === "string") return responseData.jwt;
  if (typeof responseData?.data?.jwt === "string") return responseData.data.jwt;
  return null;
}

function unwrapApiData(responseData) {
  if (!responseData || typeof responseData !== "object") return responseData;
  if (responseData.data !== undefined) return responseData.data;
  return responseData;
}

function normalizeRole(value) {
  if (typeof value !== "string") return null;
  return value.replace(/^ROLE_/, "").toUpperCase();
}

function extractRoleFromPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (typeof payload.role === "string") return normalizeRole(payload.role);
  if (typeof payload.userRole === "string") return normalizeRole(payload.userRole);
  if (typeof payload?.user?.role === "string") return normalizeRole(payload.user.role);
  return null;
}

function extractApprovalStatus(payload) {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload.approvalStatus || payload.status || payload?.user?.status || payload?.accountStatus;
  if (typeof raw !== "string") return null;
  return raw.toUpperCase();
}

/* ── Provider ── */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [userRole, setUserRole] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [authReady, setAuthReady] = useState(false); // prevents flash-redirect

  // Restore session on mount — validate token before trusting it
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !isTokenExpired(token)) {
      const role = getRoleFromToken(token) || localStorage.getItem("role")?.replace(/^ROLE_/, "").toUpperCase();
      const email = localStorage.getItem("email") || "";
      const storedApprovalStatus = (localStorage.getItem("status") || localStorage.getItem("approvalStatus") || "ACTIVE").toUpperCase();
      if (role) {
        setUser({ email, role });
        setToken(token);
        setUserRole(role);
        setApprovalStatus(storedApprovalStatus);
      } else {
        // Token is valid but can't determine role → clear
        clearStorage();
      }
    } else if (token) {
      // Token exists but is expired → clean up
      clearStorage();
    }

    setAuthReady(true);
  }, []);

  // Periodically check token expiry (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (token && isTokenExpired(token)) {
        clearStorage();
        setUser(null);
        // The axios interceptor will handle the redirect on next API call
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  function clearStorage() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("email");
    localStorage.removeItem("approvalStatus");
    localStorage.removeItem("status");
  }

  const persistSession = useCallback((nextToken, meta = {}) => {
    const role = normalizeRole(meta.role) || getRoleFromToken(nextToken);
    const email = meta.email || localStorage.getItem("email") || "";
    const status = (meta.approvalStatus || "ACTIVE").toUpperCase();

    if (!nextToken || !role) {
      throw new Error("Unable to establish session.");
    }

    localStorage.setItem("token", nextToken);
    localStorage.setItem("role", role);
    if (email) localStorage.setItem("email", email);
    localStorage.setItem("approvalStatus", status);
    localStorage.setItem("status", status);

    setToken(nextToken);
    setUserRole(role);
    setApprovalStatus(status);
    setUser({ email, role });

    return { role, approvalStatus: status };
  }, []);

  const setApprovalOnly = useCallback((status) => {
    const normalized = (status || "").toUpperCase();
    setApprovalStatus(normalized);
    if (normalized) {
      localStorage.setItem("approvalStatus", normalized);
      localStorage.setItem("status", normalized);
    }
    return normalized;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const payload = unwrapApiData(res.data) || {};
    const receivedToken = extractTokenFromResponse(res.data) || extractTokenFromResponse(payload);
    const payloadRole = extractRoleFromPayload(payload);
    const payloadStatus = extractApprovalStatus(payload) || "ACTIVE";

    if (!receivedToken) {
      return {
        token: "",
        role: payloadRole || "",
        approvalStatus: payloadStatus,
        status: payloadStatus,
        payload,
      };
    }

    const session = persistSession(receivedToken, {
      email,
      role: payloadRole,
      approvalStatus: payloadStatus,
    });
    return {
      token: receivedToken,
      role: session.role,
      approvalStatus: session.approvalStatus,
      status: session.approvalStatus,
      payload,
    };
  }, [persistSession]);

  const register = useCallback(async ({ name, email, password, role }) => {
    const res = await api.post("/auth/register", { name, email, password, role });
    const payload = unwrapApiData(res.data) || {};
    setApprovalOnly(extractApprovalStatus(payload) || "PENDING");
    return payload;
  }, [setApprovalOnly]);

  const requestOtp = useCallback(async ({ method, value }) => {
    const endpoint = method === "phone" ? "/auth/phone/request-otp" : "/auth/email/request-otp";
    const body = method === "phone" ? { phoneNumber: value } : { email: value };
    const res = await api.post(endpoint, body);
    return unwrapApiData(res.data) || {};
  }, []);

  const verifyOtp = useCallback(async ({ method, payload }) => {
    const endpoint = method === "phone" ? "/auth/phone/verify-otp" : "/auth/email/verify-otp";
    const res = await api.post(endpoint, payload);
    const data = unwrapApiData(res.data) || {};
    const receivedToken = extractTokenFromResponse(res.data) || extractTokenFromResponse(data);
    const nextStatus = extractApprovalStatus(data) || "PENDING";
    const nextRole = extractRoleFromPayload(data);

    if (receivedToken) {
      const session = persistSession(receivedToken, {
        email: payload?.email || "",
        role: nextRole,
        approvalStatus: nextStatus,
      });
      return { token: receivedToken, role: session.role, approvalStatus: session.approvalStatus, payload: data };
    }

    setApprovalOnly(nextStatus);
    return { token: "", role: nextRole || "", approvalStatus: nextStatus, payload: data };
  }, [persistSession, setApprovalOnly]);

  const oauthLogin = useCallback(async ({ provider, credential, role }) => {
    const lower = String(provider || "").toLowerCase();
    const endpointSuffix = lower === "github" ? "github" : "google";
    const endpoints = [`/auth/oauth/${endpointSuffix}`, `/api/auth/oauth/${endpointSuffix}`];
    const candidateBodies = [
      { oauthToken: credential, role: normalizeRole(role) || undefined },
      lower === "github" ? { accessToken: credential, role: normalizeRole(role) || undefined } : { idToken: credential, role: normalizeRole(role) || undefined },
    ];

    let res;
    let lastError;
    for (const endpoint of endpoints) {
      for (const body of candidateBodies) {
        try {
          res = await api.post(endpoint, body);
          lastError = null;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (res) break;
    }

    if (!res) {
      throw lastError || new Error("OAuth login failed.");
    }

    const payload = unwrapApiData(res.data) || {};
    const receivedToken = extractTokenFromResponse(res.data) || extractTokenFromResponse(payload);
    const nextStatus = extractApprovalStatus(payload) || "PENDING";
    const nextRole = extractRoleFromPayload(payload);

    if (receivedToken) {
      const session = persistSession(receivedToken, {
        role: nextRole,
        approvalStatus: nextStatus,
      });
      return { token: receivedToken, role: session.role, approvalStatus: session.approvalStatus, payload };
    }

    setApprovalOnly(nextStatus);
    return { token: "", role: nextRole || "", approvalStatus: nextStatus, payload };
  }, [persistSession, setApprovalOnly]);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    setToken("");
    setUserRole("");
    setApprovalStatus("");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        userRole,
        approvalStatus,
        authReady,
        login,
        logout,
        register,
        requestOtp,
        verifyOtp,
        oauthLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
