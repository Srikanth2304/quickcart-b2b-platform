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
  // Support common claim shapes
  if (Array.isArray(payload.roles) && payload.roles.length > 0) return payload.roles[0];
  if (typeof payload.role === "string") return payload.role;
  if (Array.isArray(payload.authorities) && payload.authorities.length > 0) {
    const auth = payload.authorities[0];
    return typeof auth === "string" ? auth.replace(/^ROLE_/, "") : auth.authority?.replace(/^ROLE_/, "") || null;
  }
  return null;
}

/* ── Provider ── */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // prevents flash-redirect

  // Restore session on mount — validate token before trusting it
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !isTokenExpired(token)) {
      const role = getRoleFromToken(token) || localStorage.getItem("role");
      const email = localStorage.getItem("email") || "";
      if (role) {
        setUser({ email, role });
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
  }

  const login = useCallback(async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const token = res.data.token;

    if (!token) throw new Error("No token received from server.");

    const role = getRoleFromToken(token);
    if (!role) throw new Error("Unable to determine user role.");

    // Persist
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("email", email);

    setUser({ email, role });
    return role;
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, authReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
