import { useEffect, useState } from "react";
import CatalogSidebar from "../../components/catalog/CatalogSidebar";
import EditCategoryModal from "../../components/modals/EditCategoryModal";
import DependencyWarningDialog from "../../components/common/DependencyWarningDialog";
import { createCategoriesBulk, deleteCategory, getCategories, getCategoryTree, updateCategory } from "../../services/catalogService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";
import "./catalog.css";

function TreeNode({ node }) {
  const label = node?.name || node?.title || node?.slug || "Unnamed";
  const children = node?.children || node?.subCategories || node?.nodes || [];
  return (
    <li>
      <span>{label}</span>
      {Array.isArray(children) && children.length > 0 && (
        <ul>
          {children.map((child, idx) => (
            <TreeNode key={child?.id || `${label}-${idx}`} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function CatalogCategories() {
  const [rows, setRows] = useState([{ name: "", slug: "", parentSlug: "" }]);
  const [categories, setCategories] = useState([]);
  const [tree, setTree] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [dependencyDialog, setDependencyDialog] = useState({ open: false, items: [], categoryId: null });

  function getCategoryStatus(category) {
    if (typeof category?.isActive === "boolean") return category.isActive ? "ACTIVE" : "INACTIVE";
    return String(category?.status || "ACTIVE").toUpperCase();
  }

  async function loadCategories() {
    try {
      setLoadingCategories(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadTree() {
    try {
      setLoadingTree(true);
      const data = await getCategoryTree();
      setTree(data);
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setLoadingTree(false);
    }
  }

  useEffect(() => {
    loadCategories();
    loadTree();
  }, []);

  function updateRow(index, patch) {
    setRows((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", slug: "", parentSlug: "" }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const categories = rows
      .map((item) => ({
        name: item.name.trim(),
        slug: item.slug.trim(),
        parentSlug: item.parentSlug.trim() || undefined,
      }))
      .filter((item) => item.name && item.slug);

    if (categories.length === 0) {
      showToast("Add at least one valid category.", "error");
      return;
    }

    try {
      setSubmitting(true);
      await createCategoriesBulk({ categories });
      setRows([{ name: "", slug: "", parentSlug: "" }]);
      await loadCategories();
      await loadTree();
      showToast("Categories created successfully", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateCategory(payload) {
    if (!editingCategory?.id) return;
    try {
      setActionLoading(true);
      await updateCategory(editingCategory.id, payload);
      setEditingCategory(null);
      await loadCategories();
      await loadTree();
      showToast("Category updated successfully", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCategory(category) {
    if (!category?.id) return;
    try {
      setActionLoading(true);
      await deleteCategory(category.id);
      await loadCategories();
      await loadTree();
      showToast("Category deleted successfully", "success");
    } catch (error) {
      const payload = error?.response?.data;
      if (payload) {
        console.error(payload);
      }
      if (error?.response?.status === 409) {
        setDependencyDialog({
          open: true,
          items: payload?.dependentProducts || [],
          categoryId: category.id,
        });
      } else {
        showToast("API Error. Please check backend logs.", "error");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleForceDelete() {
    if (!dependencyDialog.categoryId) return;
    try {
      setActionLoading(true);
      await deleteCategory(dependencyDialog.categoryId, true);
      setDependencyDialog({ open: false, items: [], categoryId: null });
      await loadCategories();
      await loadTree();
      showToast("Category deleted successfully", "success");
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
    <CatalogSidebar title="Categories">
      <div className="catalog-grid">
        <form className="catalog-form-wrap" onSubmit={handleSubmit}>
          {rows.map((row, index) => (
            <div className="catalog-form-row" key={index}>
              <input
                className="sa-input"
                placeholder="Category Name"
                value={row.name}
                onChange={(event) => updateRow(index, { name: event.target.value })}
              />
              <input
                className="sa-input"
                placeholder="Slug"
                value={row.slug}
                onChange={(event) => updateRow(index, { slug: event.target.value })}
              />
              <input
                className="sa-input"
                placeholder="Parent Slug (optional)"
                value={row.parentSlug}
                onChange={(event) => updateRow(index, { parentSlug: event.target.value })}
              />
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
            <button type="button" className="sa-btn ghost" onClick={addRow}>Add Category</button>
            <button type="submit" className="sa-btn primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Create Categories"}
            </button>
          </div>
        </form>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Slug</th>
                <th>Parent Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingCategories ? (
                <tr><td className="sa-empty" colSpan={5}>Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td className="sa-empty" colSpan={5}>No categories found.</td></tr>
              ) : (
                categories.map((category, idx) => (
                  <tr key={category.id || category.slug || idx}>
                    <td>{category.name || "-"}</td>
                    <td>{category.slug || "-"}</td>
                    <td>{category.parentName || category.parent?.name || category.parentSlug || "-"}</td>
                    <td>{getCategoryStatus(category)}</td>
                    <td>
                      <div className="sa-actions">
                        <button type="button" className="sa-btn ghost" onClick={() => setEditingCategory(category)}>Edit</button>
                        <button
                          type="button"
                          className="sa-btn danger"
                          onClick={() => handleDeleteCategory(category)}
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

        <div className="catalog-tree">
          <h3 style={{ marginTop: 0 }}>Category Tree</h3>
          {loadingTree ? (
            <p className="sa-empty">Loading tree...</p>
          ) : tree.length === 0 ? (
            <p className="sa-empty">No categories available.</p>
          ) : (
            <ul>
              {tree.map((node, index) => (
                <TreeNode key={node?.id || `root-${index}`} node={node} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <EditCategoryModal
        open={Boolean(editingCategory)}
        category={editingCategory}
        submitting={actionLoading}
        onClose={() => setEditingCategory(null)}
        onSubmit={handleUpdateCategory}
      />

      <DependencyWarningDialog
        open={dependencyDialog.open}
        title="Category has dependent products"
        message="Deleting this category may affect these products."
        items={dependencyDialog.items}
        loading={actionLoading}
        onClose={() => setDependencyDialog({ open: false, items: [], categoryId: null })}
        onForceDelete={handleForceDelete}
      />
    </CatalogSidebar>
  );
}
