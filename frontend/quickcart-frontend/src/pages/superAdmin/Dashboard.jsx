import { useEffect, useState } from "react";
import RoleSidebarLayout from "../../components/layout/RoleSidebarLayout";
import { fetchUserCounts } from "../../services/superAdminService";
import { showToast } from "../../utils/notify";
import "./superAdmin.css";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({ admins: 0, users: 0, pending: 0 });

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const counts = await fetchUserCounts();
        if (!isMounted) return;
        setStats({
          admins: counts.totalAdmins,
          users: counts.totalUsers,
          pending: counts.pendingUsers,
        });
      } catch (error) {
        if (!isMounted) return;
        showToast(error?.response?.data?.message || "Failed to load dashboard stats.", "error");
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <RoleSidebarLayout role="SUPER_ADMIN" title="Super Admin Dashboard">
      <div className="sa-grid">
        <div className="sa-banner">Welcome SUPER_ADMIN</div>

        <section className="sa-cards">
          <article className="sa-card">
            <p>Total Admins</p>
            <h3>{stats.admins}</h3>
          </article>
          <article className="sa-card">
            <p>Total Users</p>
            <h3>{stats.users}</h3>
          </article>
          <article className="sa-card">
            <p>Pending Users Count</p>
            <h3>{stats.pending}</h3>
          </article>
        </section>
      </div>
    </RoleSidebarLayout>
  );
}
