import { useEffect, useState } from "react";
import ManufacturerSidebar from "../../components/manufacturer/ManufacturerSidebar";
import EditProductModal from "../../components/modals/EditProductModal";
import UploadProductImagesModal from "../../components/modals/UploadProductImagesModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  deleteProduct,
  getMyProducts,
  updateProduct,
  updateProductStatus,
  uploadProductImages,
} from "../../services/manufacturerService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";
import "./manufacturer.css";

function isActiveProduct(item) {
  if (typeof item?.isActive === "boolean") return item.isActive;
  return String(item?.status || "").toUpperCase() === "ACTIVE";
}

export default function ManufacturerProductsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [imageProduct, setImageProduct] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  async function loadProducts() {
    try {
      setLoading(true);
      const result = await getMyProducts(0, 50);
      setRows(result.content || []);
    } catch (error) {
      if (error?.response?.data) console.error(error.response.data);
      showToast("Operation failed. Check logs.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleUpdate(payload) {
    if (!editProduct?.id) return;
    try {
      setActionLoading(true);
      await updateProduct(editProduct.id, payload);
      setEditProduct(null);
      await loadProducts();
    } catch (error) {
      if (error?.response?.data) console.error(error.response.data);
      showToast("Operation failed. Check logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(item) {
    if (!item?.id) return;
    try {
      setActionLoading(true);
      await updateProductStatus(item.id, !isActiveProduct(item));
      await loadProducts();
    } catch (error) {
      if (error?.response?.data) console.error(error.response.data);
      showToast("Operation failed. Check logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteItem?.id) return;
    try {
      setActionLoading(true);
      await deleteProduct(deleteItem.id);
      setDeleteItem(null);
      await loadProducts();
    } catch (error) {
      if (error?.response?.data) console.error(error.response.data);
      showToast("Operation failed. Check logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUploadImages(payload) {
    if (!imageProduct?.id) return;
    try {
      setActionLoading(true);
      await uploadProductImages(imageProduct.id, payload);
      setImageProduct(null);
      await loadProducts();
    } catch (error) {
      if (error?.response?.data) console.error(error.response.data);
      showToast("Operation failed. Check logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ManufacturerSidebar title="Products">
      <div className="mf-grid">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>MOQ</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="sa-empty" colSpan={8}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="sa-empty" colSpan={8}>No products found.</td></tr>
              ) : (
                rows.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td>{item.name || "-"}</td>
                    <td>{item.brandName || item.brand?.name || "-"}</td>
                    <td>{item.categoryName || item.category?.name || "-"}</td>
                    <td>{item.price ?? "-"}</td>
                    <td>{item.moq ?? item.minOrderQuantity ?? "-"}</td>
                    <td>{item.stock ?? "-"}</td>
                    <td>
                      <span className={`sa-chip ${isActiveProduct(item) ? "active" : "inactive"}`}>
                        {isActiveProduct(item) ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div className="sa-actions">
                        <button type="button" className="sa-btn ghost" onClick={() => setEditProduct(item)}>Edit</button>
                        <button type="button" className="sa-btn ghost" onClick={() => handleToggleStatus(item)} disabled={actionLoading}>
                          {isActiveProduct(item) ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="sa-btn ghost" onClick={() => setImageProduct(item)}>Upload Images</button>
                        <button type="button" className="sa-btn danger" onClick={() => setDeleteItem(item)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditProductModal
        open={Boolean(editProduct)}
        product={editProduct}
        submitting={actionLoading}
        onClose={() => setEditProduct(null)}
        onSubmit={handleUpdate}
      />

      <UploadProductImagesModal
        open={Boolean(imageProduct)}
        product={imageProduct}
        submitting={actionLoading}
        onClose={() => setImageProduct(null)}
        onSubmit={handleUploadImages}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        title="Delete Product"
        message="Are you sure you want to delete this product?"
        confirmText="Delete"
        loading={actionLoading}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />
    </ManufacturerSidebar>
  );
}
