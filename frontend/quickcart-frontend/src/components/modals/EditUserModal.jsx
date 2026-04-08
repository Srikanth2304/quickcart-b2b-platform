import { useEffect, useState } from "react";

export default function EditUserModal({ open, user, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "" });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      email: user.email || "",
    });
  }, [user]);

  if (!open || !user) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
    });
  };

  return (
    <div className="sa-modal-backdrop" onClick={onClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>Edit User</header>
        <form onSubmit={handleSubmit}>
          <section>
            <input
              className="sa-input"
              placeholder="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="sa-input"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </section>
          <footer>
            <button type="button" className="sa-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
