import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "./RoleSidebarLayout.css";

const ROLE_MENU = {
  SUPER_ADMIN: [
    { label: "Dashboard", to: "/super-admin/dashboard" },
    { label: "Admins", to: "/super-admin/admins" },
    { label: "Users", to: "/super-admin/users" },
  ],
  ADMIN: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Catalog Managers", to: "/admin/catalog-managers" },
  ],
  CATALOG_MANAGER: [
    { label: "Dashboard", to: "/catalog/dashboard" },
    { label: "Pending Users", to: "/catalog/pending-users" },
    { label: "Brands", to: "/catalog/brands" },
    { label: "Categories", to: "/catalog/categories" },
  ],
  MANUFACTURER: [
    { label: "Dashboard", to: "/manufacturer/dashboard" },
    { label: "Products", to: "/manufacturer/products" },
    { label: "Orders", to: "/manufacturer/orders" },
    { label: "Shipments", to: "/manufacturer/shipments" },
    { label: "Returns", to: "/manufacturer/returns" },
  ],
  RETAILER: [
    { label: "Dashboard", to: "/retailer/dashboard" },
    { label: "Browse Products", to: "/retailer/products" },
    { label: "Orders", to: "/retailer/orders" },
    { label: "Returns", to: "/retailer/returns" },
  ],
};

export default function RoleSidebarLayout({ role, title, children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const normalizedRole = String(role || user?.role || "").replace(/^ROLE_/, "").toUpperCase();
  const menu = ROLE_MENU[normalizedRole] || [];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="role-shell">
      <aside className="role-sidebar">
        <div className="role-brand">QuickCart</div>
        <div className="role-tag">{normalizedRole || "USER"}</div>

        <nav className="role-nav">
          {menu.map((item) => (
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
