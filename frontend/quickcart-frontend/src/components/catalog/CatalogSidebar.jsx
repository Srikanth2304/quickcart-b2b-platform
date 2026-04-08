import { Navigate } from "react-router-dom";
import RoleSidebarLayout from "../layout/RoleSidebarLayout";
import { useAuth } from "../../auth/AuthContext";

export default function CatalogSidebar({ title, children }) {
  const { user } = useAuth();
  const role = String(user?.role || "").replace(/^ROLE_/, "").toUpperCase();

  if (user && role !== "CATALOG_MANAGER") {
    return <Navigate to="/login" replace />;
  }

  return (
    <RoleSidebarLayout role="CATALOG_MANAGER" title={title}>
      {children}
    </RoleSidebarLayout>
  );
}
