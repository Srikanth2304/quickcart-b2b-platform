import { useState } from "react";

export default function CreateCatalogManagerModal({ open, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
    });
  };

  const handleClose = () => {
    setForm({ name: "", email: "", password: "" });
    onClose();
  };

  return (
    <div className="sa-modal-backdrop" onClick={handleClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>Create Catalog Manager</header>
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
            <input
              className="sa-input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              minLength={8}
              required
            />
          </section>
          <footer>
            <button type="button" className="sa-btn secondary" onClick={handleClose}>Cancel</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
