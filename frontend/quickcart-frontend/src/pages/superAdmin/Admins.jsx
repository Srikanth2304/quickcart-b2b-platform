import { useEffect, useState } from "react";
import RoleSidebarLayout from "../../components/layout/RoleSidebarLayout";
import EditUserModal from "../../components/modals/EditUserModal";
import ResetPasswordModal from "../../components/modals/ResetPasswordModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  createAdminUser,
  deleteUser,
  fetchAdmins,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "../../services/superAdminService";
import { showToast } from "../../utils/notify";
import "./superAdmin.css";

function getRole(row) {
  return row?.role || row?.roles?.[0] || "ADMIN";
}

function getStatus(row) {
  if (typeof row?.status === "string") return row.status;
  if (typeof row?.approvalStatus === "string") return row.approvalStatus;
  if (row?.isActive === true) return "ACTIVE";
  if (row?.isActive === false) return "INACTIVE";
  return "-";
}

function isUserActive(row) {
  if (typeof row?.isActive === "boolean") return row.isActive;
  const status = String(getStatus(row) || "").toUpperCase();
  return status === "ACTIVE";
}

function formatDate(row) {
  const raw = row?.createdDate || row?.createdAt || row?.createdOn;
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUserItem, setDeleteUserItem] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  function handleApiError(error) {
    if (error?.response?.data) {
      console.error(error.response.data);
    }
    showToast("API Error. Please check backend logs.", "error");
  }

  async function loadAdmins() {
    try {
      setLoading(true);
      const list = await fetchAdmins();
      setAdmins(list);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  async function handleCreateAdmin(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      showToast("Name, email, and password are required.", "error");
      return;
    }

    try {
      setSubmitting(true);
      await createAdminUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      showToast("Admin created successfully.", "success");
      setOpenModal(false);
      setForm({ name: "", email: "", password: "" });
      await loadAdmins();
    } catch (error) {
      if (error?.response?.status === 409) {
        showToast("Email already exists.", "error");
      } else {
        handleApiError(error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateUser(payload) {
    if (!editingUser?.id) return;
    try {
      setActionLoading(true);
      await updateUser(editingUser.id, payload);
      setEditingUser(null);
      await loadAdmins();
      showToast("User updated successfully.", "success");
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
      await updateUserStatus(user.id, !isUserActive(user));
      await loadAdmins();
      showToast("User status updated.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserItem?.id) return;
    try {
      setActionLoading(true);
      await deleteUser(deleteUserItem.id);
      setDeleteUserItem(null);
      await loadAdmins();
      showToast("User deleted successfully.", "success");
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
      await resetUserPassword(resetUser.id, password);
      setResetUser(null);
      showToast("Password reset successfully.", "success");
    } catch (error) {
      handleApiError(error);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <RoleSidebarLayout role="SUPER_ADMIN" title="Admins">
      <div className="sa-grid">
        <div className="sa-toolbar">
          <h3 style={{ margin: 0 }}>Admin Management</h3>
          <button type="button" className="sa-btn primary" onClick={() => setOpenModal(true)}>
            Create Admin
          </button>
        </div>

        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="sa-empty" colSpan={6}>Loading...</td></tr>
              ) : admins.length === 0 ? (
                <tr><td className="sa-empty" colSpan={6}>No admins found.</td></tr>
              ) : (
                admins.map((admin, idx) => (
                  <tr key={admin.id || admin.email || idx}>
                    <td>{admin.name || "-"}</td>
                    <td>{admin.email || "-"}</td>
                    <td>{getRole(admin)}</td>
                    <td>
                      <span className={`sa-chip ${isUserActive(admin) ? "active" : "inactive"}`}>
                        {getStatus(admin)}
                      </span>
                    </td>
                    <td>{formatDate(admin)}</td>
                    <td>
                      <div className="sa-actions">
                        <button type="button" className="sa-btn ghost" onClick={() => setEditingUser(admin)}>Edit</button>
                        <button
                          type="button"
                          className="sa-btn ghost"
                          onClick={() => handleToggleStatus(admin)}
                          disabled={actionLoading}
                        >
                          {isUserActive(admin) ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="sa-btn ghost" onClick={() => setResetUser(admin)}>Reset Password</button>
                        <button type="button" className="sa-btn danger" onClick={() => setDeleteUserItem(admin)}>
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

      {openModal && (
        <div className="sa-modal-backdrop" onClick={() => setOpenModal(false)} role="presentation">
          <div className="sa-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>Create Admin</header>
            <form onSubmit={handleCreateAdmin}>
              <section>
                <input
                  className="sa-input"
                  placeholder="Name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  className="sa-input"
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <input
                  className="sa-input"
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                />
              </section>
              <footer>
                <button type="button" className="sa-btn secondary" onClick={() => setOpenModal(false)}>Cancel</button>
                <button type="submit" className="sa-btn primary" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      <EditUserModal
        open={Boolean(editingUser)}
        user={editingUser}
        submitting={actionLoading}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
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
        title="Delete User"
        message="Are you sure you want to delete this user?"
        confirmText="Delete"
        loading={actionLoading}
        onClose={() => setDeleteUserItem(null)}
        onConfirm={handleDeleteUser}
      />
    </RoleSidebarLayout>
  );
}
