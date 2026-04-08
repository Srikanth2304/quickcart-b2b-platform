import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ManufacturerSidebar from "../../components/manufacturer/ManufacturerSidebar";
import { createProduct, getBrands, getCategories } from "../../services/manufacturerService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";
import "./manufacturer.css";

export default function ManufacturerCreateProductPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    brandId: "",
    categoryId: "",
    price: "",
    moq: "",
    stock: "",
    isActive: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [brandRows, categoryRows] = await Promise.all([getBrands(), getCategories()]);
        setBrands(brandRows);
        setCategories(categoryRows);
      } catch (error) {
        if (error?.response?.data) console.error(error.response.data);
        showToast("Operation failed. Check logs.", "error");
      }
    }
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSubmitting(true);
      await createProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        brandId: Number(form.brandId),
        categoryId: Number(form.categoryId),
        price: Number(form.price),
        moq: Number(form.moq),
        stock: Number(form.stock),
        isActive: form.isActive,
      });
      navigate("/manufacturer/products", { replace: true });
    } catch (error) {
      if (error?.response?.data) console.error(error.response.data);
      showToast("Operation failed. Check logs.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ManufacturerSidebar title="Create Product">
      <div className="mf-grid">
        <form className="catalog-form-wrap" onSubmit={handleSubmit}>
          <div className="mf-form-grid">
            <input className="sa-input" placeholder="Product Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <select className="sa-select" value={form.brandId} onChange={(e) => setForm((p) => ({ ...p, brandId: e.target.value }))} required>
              <option value="">Select Brand</option>
              {brands.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className="sa-select" value={form.categoryId} onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))} required>
              <option value="">Select Category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input className="sa-input" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
            <input className="sa-input" type="number" placeholder="MOQ" value={form.moq} onChange={(e) => setForm((p) => ({ ...p, moq: e.target.value }))} required />
            <input className="sa-input" type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))} required />
            <textarea className="sa-input full" rows={4} placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <label className="full" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} />
              Active Product
            </label>
          </div>
          <div className="sa-actions" style={{ marginTop: 10 }}>
            <button type="submit" className="sa-btn primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </ManufacturerSidebar>
  );
}
