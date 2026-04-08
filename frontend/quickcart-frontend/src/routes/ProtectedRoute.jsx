import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Loader from "../components/Loader";

function getHomeByRole(role) {
  switch (String(role || "").replace(/^ROLE_/, "").toUpperCase()) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "CATALOG_MANAGER":
      return "/catalog/dashboard";
    case "MANUFACTURER":
      return "/manufacturer/dashboard";
    case "RETAILER":
      return "/retailer/dashboard";
    default:
      return "/login";
  }
}

export default function ProtectedRoute({ children, allowedRoles, role }) {
  const { user, authReady } = useAuth();
  const normalizedUserRole = String(user?.role || "").replace(/^ROLE_/, "").toUpperCase();
  const rolesToCheck = role
    ? [String(role).replace(/^ROLE_/, "").toUpperCase()]
    : Array.isArray(allowedRoles)
      ? allowedRoles.map((value) => String(value).replace(/^ROLE_/, "").toUpperCase())
      : [];

  // Wait until token validation finishes — prevents flash-redirect
  if (!authReady) {
    return <Loader fullPage text="Loading…" />;
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → redirect to their own dashboard
  if (rolesToCheck.length > 0 && !rolesToCheck.includes(normalizedUserRole)) {
    return <Navigate to={getHomeByRole(normalizedUserRole)} replace />;
  }

  return children;
}
