import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "../layout/RoleSidebarLayout.css";

const MANUFACTURER_MENU = [
  { label: "Dashboard", to: "/manufacturer/dashboard" },
  { label: "Products", to: "/manufacturer/products" },
  { label: "Create Product", to: "/manufacturer/create-product" },
];

export default function ManufacturerSidebar({ title, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const role = String(user?.role || "").replace(/^ROLE_/, "").toUpperCase();

  if (user && role !== "MANUFACTURER") {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="role-shell">
      <aside className="role-sidebar">
        <div className="role-brand">QuickCart</div>
        <div className="role-tag">MANUFACTURER</div>

        <nav className="role-nav">
          {MANUFACTURER_MENU.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `role-nav-item ${isActive ? "active" : ""}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="role-logout" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="role-content">
        <header className="role-header">
          <h1>{title}</h1>
        </header>
        <section className="role-body">{children}</section>
      </main>
    </div>
  );
}
