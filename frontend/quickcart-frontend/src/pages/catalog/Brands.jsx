import { useEffect, useState } from "react";
import CatalogSidebar from "../../components/catalog/CatalogSidebar";
import EditBrandModal from "../../components/modals/EditBrandModal";
import DependencyWarningDialog from "../../components/common/DependencyWarningDialog";
import {
  createBrandsBulk,
  deleteBrand,
  getBrands,
  updateBrand,
  updateBrandStatus,
} from "../../services/catalogService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";
import "./catalog.css";

function isActiveBrand(row) {
  if (typeof row?.isActive === "boolean") return row.isActive;
  return String(row?.status || "").toUpperCase() === "ACTIVE";
}

function formatDate(row) {
  const raw = row?.createdDate || row?.createdAt || row?.createdOn;
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function CatalogBrands() {
  const [rows, setRows] = useState([{ name: "", slug: "" }]);
  const [brands, setBrands] = useState([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dependencyDialog, setDependencyDialog] = useState({ open: false, title: "", items: [], brandId: null });

  async function loadBrands() {
    try {
      setLoadingBrands(true);
      const data = await getBrands();
      setBrands(data);
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setLoadingBrands(false);
    }
  }

  useEffect(() => {
    loadBrands();
  }, []);

  function updateRow(index, patch) {
    setRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", slug: "" }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const brands = rows
      .map((item) => ({ name: item.name.trim(), slug: item.slug.trim() }))
      .filter((item) => item.name && item.slug);

    if (brands.length === 0) {
      showToast("Add at least one valid brand.", "error");
      return;
    }

    try {
      setSubmitting(true);
      await createBrandsBulk({ brands });
      setRows([{ name: "", slug: "" }]);
      await loadBrands();
      showToast("Brands created successfully", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateBrand(payload) {
    if (!editingBrand?.id) return;
    try {
      setActionLoading(true);
      await updateBrand(editingBrand.id, payload);
      setEditingBrand(null);
      await loadBrands();
      showToast("Brand updated successfully", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(brand) {
    if (!brand?.id) return;
    try {
      setActionLoading(true);
      await updateBrandStatus(brand.id, !isActiveBrand(brand));
      await loadBrands();
      showToast("Brand status updated", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteBrand(brand) {
    if (!brand?.id) return;
    try {
      setActionLoading(true);
      await deleteBrand(brand.id);
      await loadBrands();
      showToast("Brand deleted successfully", "success");
    } catch (error) {
      const payload = error?.response?.data;
      if (payload) {
        console.error(payload);
      }
      if (error?.response?.status === 409) {
        setDependencyDialog({
          open: true,
          title: "Cannot delete Brand",
          items: payload?.dependentProducts || [],
          brandId: brand.id,
        });
      } else {
        showToast("API Error. Please check backend logs.", "error");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleForceDeleteBrand() {
    if (!dependencyDialog.brandId) return;
    try {
      setActionLoading(true);
      await deleteBrand(dependencyDialog.brandId, true);
      setDependencyDialog({ open: false, title: "", items: [], brandId: null });
      await loadBrands();
      showToast("Brand deleted successfully", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <CatalogSidebar title="Brands">
      <div className="catalog-grid">
        <form className="catalog-form-wrap" onSubmit={handleSubmit}>
          {rows.map((row, index) => (
            <div className="catalog-form-row" key={index}>
              <input
                className="sa-input"
                placeholder="Brand Name"
                value={row.name}
                onChange={(event) => updateRow(index, { name: event.target.value })}
              />
              <input
                className="sa-input"
                placeholder="Slug"
                value={row.slug}
                onChange={(event) => updateRow(index, { slug: event.target.value })}
              />
              <div />
              <button
                type="button"
                className="sa-btn danger"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="sa-actions">
            <button type="button" className="sa-btn ghost" onClick={addRow}>Add Brand</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Create Brands"}
            </button>
          </div>
        </form>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Brand Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingBrands ? (
                <tr><td className="sa-empty" colSpan={5}>Loading...</td></tr>
              ) : brands.length === 0 ? (
                <tr><td className="sa-empty" colSpan={5}>No brands found.</td></tr>
              ) : (
                brands.map((brand, idx) => (
                  <tr key={brand.id || brand.slug || idx}>
                    <td>{brand.name || "-"}</td>
                    <td>{brand.slug || "-"}</td>
                    <td>
                      <span className={`sa-chip ${isActiveBrand(brand) ? "active" : "inactive"}`}>
                        {isActiveBrand(brand) ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td>{formatDate(brand)}</td>
                    <td>
                      <div className="sa-actions">
                        <button type="button" className="sa-btn ghost" onClick={() => setEditingBrand(brand)}>Edit</button>
                        <button
                          type="button"
                          className="sa-btn ghost"
                          onClick={() => handleToggleStatus(brand)}
                          disabled={actionLoading}
                        >
                          {isActiveBrand(brand) ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="sa-btn danger"
                          onClick={() => handleDeleteBrand(brand)}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditBrandModal
        open={Boolean(editingBrand)}
        brand={editingBrand}
        submitting={actionLoading}
        onClose={() => setEditingBrand(null)}
        onSubmit={handleUpdateBrand}
      />

      <DependencyWarningDialog
        open={dependencyDialog.open}
        title={dependencyDialog.title}
        message="Brand has dependent products"
        items={dependencyDialog.items}
        loading={actionLoading}
        onClose={() => setDependencyDialog({ open: false, title: "", items: [], brandId: null })}
        onForceDelete={handleForceDeleteBrand}
      />
    </CatalogSidebar>
  );
}
