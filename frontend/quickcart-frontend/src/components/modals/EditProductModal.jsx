import { useEffect, useState } from "react";

export default function EditProductModal({ open, product, submitting, onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    moq: "",
    stock: "",
    isActive: true,
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name || "",
      description: product.description || "",
      price: product.price ?? "",
      moq: product.moq ?? product.minOrderQuantity ?? "",
      stock: product.stock ?? "",
      isActive: typeof product.isActive === "boolean" ? product.isActive : String(product.status || "").toUpperCase() === "ACTIVE",
    });
  }, [product]);

  if (!open || !product) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      moq: Number(form.moq),
      stock: Number(form.stock),
      isActive: form.isActive,
    });
  };

  return (
    <div className="sa-modal-backdrop" onClick={onClose} role="presentation">
      <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <header>Edit Product</header>
        <form onSubmit={handleSubmit}>
          <section>
            <input className="sa-input" placeholder="Product Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <textarea className="sa-input" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} />
            <input className="sa-input" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
            <input className="sa-input" type="number" placeholder="MOQ" value={form.moq} onChange={(e) => setForm((p) => ({ ...p, moq: e.target.value }))} required />
            <input className="sa-input" type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} required />
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Active
            </label>
          </section>
          <footer>
            <button type="button" className="sa-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
