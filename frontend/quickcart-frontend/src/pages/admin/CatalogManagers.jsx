import { useEffect, useMemo, useState } from "react";
import RoleSidebarLayout from "../../components/layout/RoleSidebarLayout";
import CreateCatalogManagerModal from "../../components/modals/CreateCatalogManagerModal";
import EditCatalogManagerModal from "../../components/modals/EditCatalogManagerModal";
import ResetPasswordModal from "../../components/modals/ResetPasswordModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  createCatalogManager,
  deleteCatalogManager,
  getCatalogManagers,
  resetCatalogManagerPassword,
  updateCatalogManager,
  updateCatalogManagerStatus,
} from "../../services/adminService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";

function getStatus(row) {
  if (typeof row?.status === "string") return row.status.toUpperCase();
  if (row?.isActive === true) return "ACTIVE";
  if (row?.isActive === false) return "INACTIVE";
  return "-";
}

function isUserActive(row) {
  if (typeof row?.isActive === "boolean") return row.isActive;
  return getStatus(row) === "ACTIVE";
}

function formatDate(row) {
  const raw = row?.createdDate || row?.createdAt || row?.createdOn;
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function AdminCatalogManagers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUserItem, setDeleteUserItem] = useState(null);
  const [search, setSearch] = useState("");

  function handleApiError(error) {
    if (error?.response?.data) {
      console.error(error.response.data);
    }
    showToast("API Error. Please check backend logs.", "error");
  }

  async function loadCatalogManagers() {
    try {
      setLoading(true);
      const rows = await getCatalogManagers();
      setList(rows);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalogManagers();
  }, []);

  async function handleCreate(payload) {
    if (!payload.name || !payload.email || !payload.password) {
      showToast("Name, email and password are required.", "error");
      return;
    }
    try {
      setActionLoading(true);
      await createCatalogManager({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        roles: ["CATALOG_MANAGER"],
        isActive: true,
      });
      setCreateOpen(false);
      await loadCatalogManagers();
      showToast("Catalog Manager created successfully.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdate(payload) {
    if (!editingUser?.id) return;
    try {
      setActionLoading(true);
      await updateCatalogManager(editingUser.id, payload);
      setEditingUser(null);
      await loadCatalogManagers();
      showToast("Catalog Manager updated successfully.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(user) {
    if (!user?.id) return;
    try {
      setActionLoading(true);
      await updateCatalogManagerStatus(user.id, !isUserActive(user));
      await loadCatalogManagers();
      showToast("Catalog Manager status updated.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteUserItem?.id) return;
    try {
      setActionLoading(true);
      await deleteCatalogManager(deleteUserItem.id);
      setDeleteUserItem(null);
      await loadCatalogManagers();
      showToast("Catalog Manager deleted.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetPassword(password) {
    if (!resetUser?.id) return;
    try {
      setActionLoading(true);
      await resetCatalogManagerPassword(resetUser.id, password);
      setResetUser(null);
      showToast("Password reset successfully.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((row) => {
      const name = String(row?.name || "").toLowerCase();
      const email = String(row?.email || "").toLowerCase();
      return name.includes(needle) || email.includes(needle);
    });
  }, [list, search]);

  return (
    <RoleSidebarLayout role="ADMIN" title="Catalog Managers">
      <div className="sa-grid">
        <div className="sa-toolbar">
          <input
            className="sa-input"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="button" className="sa-btn primary" onClick={() => setCreateOpen(true)}>
            Create Catalog Manager
          </button>
        </div>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="sa-empty" colSpan={5}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="sa-empty" colSpan={5}>No catalog managers found.</td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id || row.email || idx}>
                    <td>{row.name || "-"}</td>
                    <td>{row.email || "-"}</td>
                    <td>
                      <span className={`sa-chip ${isUserActive(row) ? "active" : "inactive"}`}>
                        {getStatus(row)}
                      </span>
                    </td>
                    <td>{formatDate(row)}</td>
                    <td>
                      <div className="sa-actions">
                        <button type="button" className="sa-btn ghost" onClick={() => setEditingUser(row)}>Edit</button>
                        <button
                          type="button"
                          className="sa-btn ghost"
                          onClick={() => handleToggleStatus(row)}
                          disabled={actionLoading}
                        >
                          {isUserActive(row) ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="sa-btn ghost" onClick={() => setResetUser(row)}>Reset Password</button>
                        <button type="button" className="sa-btn danger" onClick={() => setDeleteUserItem(row)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCatalogManagerModal
        open={createOpen}
        submitting={actionLoading}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <EditCatalogManagerModal
        open={Boolean(editingUser)}
        user={editingUser}
        submitting={actionLoading}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdate}
      />

      <ResetPasswordModal
        open={Boolean(resetUser)}
        user={resetUser}
        submitting={actionLoading}
        onClose={() => setResetUser(null)}
        onSubmit={handleResetPassword}
      />

      <ConfirmDialog
        open={Boolean(deleteUserItem)}
        title="Delete Catalog Manager"
        message="Are you sure you want to delete this catalog manager?"
        confirmText="Delete"
        loading={actionLoading}
        onClose={() => setDeleteUserItem(null)}
        onConfirm={handleDelete}
      />
    </RoleSidebarLayout>
  );
}
