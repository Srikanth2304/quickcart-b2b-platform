import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Loader from "../components/Loader";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, authReady } = useAuth();

  // Wait until token validation finishes — prevents flash-redirect
  if (!authReady) {
    return <Loader fullPage text="Loading…" />;
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → redirect to their own dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = user.role === "MANUFACTURER" ? "/manufacturer" : "/retailer";
    return <Navigate to={home} replace />;
  }

  return children;
}
