import { useEffect, useState } from "react";

export default function EditCategoryModal({ open, category, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", slug: "", parentSlug: "" });

  useEffect(() => {
    if (!category) return;
    setForm({
      name: category.name || "",
      slug: category.slug || "",
      parentSlug: category.parentSlug || category.parent?.slug || "",
    });
  }, [category]);

  if (!open || !category) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim(),
      parentSlug: form.parentSlug.trim() || null,
    });
  };

  return (
    <div className="sa-modal-backdrop" onClick={onClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>Edit Category</header>
        <form onSubmit={handleSubmit}>
          <section>
            <input
              className="sa-input"
              placeholder="Category Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <input
              className="sa-input"
              placeholder="Slug"
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
              required
            />
            <input
              className="sa-input"
              placeholder="Parent Slug (optional)"
              value={form.parentSlug}
              onChange={(event) => setForm((prev) => ({ ...prev, parentSlug: event.target.value }))}
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
