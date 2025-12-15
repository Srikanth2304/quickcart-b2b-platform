import { createContext, useContext, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    // Call backend login API
    const res = await api.post("/auth/login", { email, password });

    // Backend returns only token
    const token = res.data.token;

    // Decode JWT to get role
    const payload = JSON.parse(atob(token.split(".")[1]));
    const role = payload.roles[0]; // "MANUFACTURER" or "RETAILER"

    // Store in localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    // Update auth state
    setUser({ email, role });

    return role;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
