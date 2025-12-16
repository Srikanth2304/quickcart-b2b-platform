import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "#222",
        color: "#fff",
      }}
    >
      <h3>QuickCart</h3>

      <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
        {user?.role === "MANUFACTURER" && (
          <Link to="/manufacturer" style={{ color: "#fff" }}>
            Dashboard
          </Link>
        )}

        {user?.role === "RETAILER" && (
          <Link to="/retailer" style={{ color: "#fff" }}>
            Dashboard
          </Link>
        )}

        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
