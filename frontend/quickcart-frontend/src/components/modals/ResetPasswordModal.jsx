import { useState } from "react";

export default function ResetPasswordModal({ open, user, submitting, onClose, onSubmit }) {
  const [password, setPassword] = useState("");

  if (!open || !user) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(password);
    setPassword("");
  };

  const handleClose = () => {
    setPassword("");
    onClose();
  };

  return (
    <div className="sa-modal-backdrop" onClick={handleClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>Reset Password</header>
        <form onSubmit={handleSubmit}>
          <section>
            <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
              Set a new password for {user.email || user.name || "selected user"}.
            </p>
            <input
              className="sa-input"
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </section>
          <footer>
            <button type="button" className="sa-btn secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>
              {submitting ? "Resetting..." : "Reset"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
