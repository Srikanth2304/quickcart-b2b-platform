import { useEffect, useState } from "react";
import CatalogSidebar from "../../components/catalog/CatalogSidebar";
import { approveUser, getPendingUsers, rejectUser } from "../../services/catalogService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";

export default function CatalogPendingUsers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadRows() {
    try {
      setLoading(true);
      const data = await getPendingUsers();
      setRows(data);
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  async function handleApprove(user) {
    if (!user?.id) return;
    try {
      setActionLoading(true);
      await approveUser(user.id);
      setRows((prev) => prev.filter((item) => item.id !== user.id));
      showToast("User approved successfully", "success");
    } catch (error) {
      if (error?.response?.data) {
        console.error(error.response.data);
      }
      showToast("API Error. Please check backend logs.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(user) {
    if (!user?.id) return;
    try {
      setActionLoading(true);
      await rejectUser(user.id);
      setRows((prev) => prev.filter((item) => item.id !== user.id));
      showToast("User rejected successfully", "success");
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
    <CatalogSidebar title="Pending Users">
      <div className="sa-grid">
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="sa-empty" colSpan={5}>Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="sa-empty" colSpan={5}>No pending users found.</td></tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id || row.email || idx}>
                    <td>{row.name || "-"}</td>
                    <td>{row.email || "-"}</td>
                    <td>{String(row.role || row.roles?.[0] || "-").replace(/^ROLE_/, "").toUpperCase()}</td>
                    <td>{String(row.status || row.approvalStatus || "PENDING").toUpperCase()}</td>
                    <td>
                      <div className="sa-actions">
                        <button
                          type="button"
                          className="sa-btn ghost"
                          onClick={() => handleApprove(row)}
                          disabled={actionLoading}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="sa-btn danger"
                          onClick={() => handleReject(row)}
                          disabled={actionLoading}
                        >
                          Reject
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
    </CatalogSidebar>
  );
}
