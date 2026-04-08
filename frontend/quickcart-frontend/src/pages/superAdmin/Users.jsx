import { useEffect, useMemo, useState } from "react";
import RoleSidebarLayout from "../../components/layout/RoleSidebarLayout";
import EditUserModal from "../../components/modals/EditUserModal";
import ResetPasswordModal from "../../components/modals/ResetPasswordModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  deleteUser,
  fetchAllUsers,
  resetUserPassword,
  updateUser,
  updateUserStatus,
} from "../../services/superAdminService";
import { showToast } from "../../utils/notify";
import "./superAdmin.css";

function getRole(row) {
  return String(row?.role || row?.roles?.[0] || "-").replace(/^ROLE_/, "").toUpperCase();
}

function getStatus(row) {
  if (typeof row?.status === "string") return row.status.toUpperCase();
  if (typeof row?.approvalStatus === "string") return row.approvalStatus.toUpperCase();
  if (row?.isActive === true) return "ACTIVE";
  if (row?.isActive === false) return "INACTIVE";
  return "-";
}

function isUserActive(row) {
  if (typeof row?.isActive === "boolean") return row.isActive;
  return String(getStatus(row)).toUpperCase() === "ACTIVE";
}

function formatDate(row) {
  const raw = row?.createdDate || row?.createdAt || row?.createdOn;
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

export default function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [actionLoading, setActionLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [deleteUserItem, setDeleteUserItem] = useState(null);

  function handleApiError(error) {
    if (error?.response?.data) {
      console.error(error.response.data);
    }
    showToast("API Error. Please check backend logs.", "error");
  }

  async function loadUsers() {
    try {
      setLoading(true);
      const list = await fetchAllUsers();
      setUsers(list);
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleUpdateUser(payload) {
    if (!editingUser?.id) return;
    try {
      setActionLoading(true);
      await updateUser(editingUser.id, payload);
      setEditingUser(null);
      await loadUsers();
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
      await loadUsers();
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
      await loadUsers();
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

  const filteredUsers = useMemo(() => {
    return users.filter((row) => {
      const emailValue = String(row?.email || "").toLowerCase();
      const roleValue = getRole(row);
      const statusValue = getStatus(row);

      if (searchEmail.trim() && !emailValue.includes(searchEmail.trim().toLowerCase())) {
        return false;
      }
      if (roleFilter !== "ALL" && roleValue !== roleFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && statusValue !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [users, searchEmail, roleFilter, statusFilter]);

  const roleOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(users.map((row) => getRole(row)).filter((value) => value && value !== "-")))];
  }, [users]);

  const statusOptions = useMemo(() => {
    return ["ALL", ...Array.from(new Set(users.map((row) => getStatus(row)).filter((value) => value && value !== "-")))];
  }, [users]);

  return (
    <RoleSidebarLayout role="SUPER_ADMIN" title="Users">
      <div className="sa-grid">
        <div className="sa-filters">
          <input
            className="sa-input"
            type="search"
            placeholder="Search by email"
            value={searchEmail}
            onChange={(event) => setSearchEmail(event.target.value)}
          />

          <select className="sa-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            {roleOptions.map((option) => (
              <option key={option} value={option}>{option === "ALL" ? "All Roles" : option}</option>
            ))}
          </select>

          <select className="sa-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>{option === "ALL" ? "All Status" : option}</option>
            ))}
          </select>
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
              ) : filteredUsers.length === 0 ? (
                <tr><td className="sa-empty" colSpan={6}>No users found.</td></tr>
              ) : (
                filteredUsers.map((row, idx) => (
                  <tr key={row.id || row.email || idx}>
                    <td>{row.name || "-"}</td>
                    <td>{row.email || "-"}</td>
                    <td>{getRole(row)}</td>
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
