import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./AuthModern.css";

export default function PendingApproval() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <div className="auth-layout" style={{ gridTemplateColumns: "1fr" }}>
        <section className="auth-card" style={{ padding: 36 }}>
          <h1 style={{ marginTop: 0 }}>Account Pending Approval</h1>
          <p>
            Your account has been created successfully.
            <br />
            It is currently pending approval from the Catalog Manager.
            <br />
            You will be able to login once approved.
          </p>
          <button
            type="button"
            className="auth-btn auth-btn--primary"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            Back to Login
          </button>
        </section>
      </div>
    </div>
  );
}
