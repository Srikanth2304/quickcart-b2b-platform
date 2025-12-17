import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useState } from "react";
import logo from "../logos/logo1.svg";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Show nothing if user is not logged in
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      navigate("/login");
    }
  };

  // Role-based navigation configuration
  const getNavLinks = () => {
    if (user.role === "MANUFACTURER") {
      return [
        { label: "Dashboard", path: "/manufacturer" },
        { label: "Products", path: "/manufacturer/products" },
        { label: "Orders", path: "/manufacturer/orders" },
        { label: "Payments", path: "/manufacturer/payments" },
      ];
    } else if (user.role === "RETAILER") {
      return [
        { label: "Dashboard", path: "/retailer" },
        { label: "Products", path: "/retailer/products" },
        { label: "Orders", path: "/retailer/orders" },
        { label: "Invoices", path: "/retailer/invoices" },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="navbar">
      <div className="navbar-content">
        {/* Logo - Leftmost */}
        <a
          href="#"
          className="logo"
          onClick={() => {
            if (user.role === "MANUFACTURER") {
              navigate("/manufacturer");
            } else if (user.role === "RETAILER") {
              navigate("/retailer");
            }
          }}
        >
          <img src={logo} alt="QuickCart" className="logo-img" />
        </a>

        {/* Navigation Menu */}
        <ul className="nav-menu">
          {navLinks.map((link) => (
            <li key={link.path}>
              <NavLink
                to={link.path}
                end={link.label === "Dashboard"}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Spacer */}
        <div className="nav-spacer"></div>

        {/* Search Bar */}
        <div className="search-container">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <input 
            type="search" 
            placeholder="Search for products, brands and more" 
            className="search-input"
            aria-label="Search"
          />
        </div>

        {/* Right Section */}
        <div className="right-section">
          {/* Profile Section with Dropdown */}
          <div
            className="profile-section"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <div className="profile-trigger">
              <div className="profile-info">
                <div className="profile-email">{user.email}</div>
                <div className="profile-role">{user.role}</div>
              </div>
              <span className="dropdown-arrow">▼</span>
            </div>

            {/* Dropdown Menu */}
            <ul className={`dropdown-menu ${dropdownOpen ? "open" : ""}`}>
              <li>
                <a href="#profile" onClick={(e) => e.preventDefault()}>
                  View Profile
                </a>
              </li>
              <li>
                <a href="#settings" onClick={(e) => e.preventDefault()}>
                  Settings
                </a>
              </li>
              <li>
                <a href="#account" onClick={(e) => e.preventDefault()}>
                  Account
                </a>
              </li>
            </ul>
          </div>

          {/* Logout Button */}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}