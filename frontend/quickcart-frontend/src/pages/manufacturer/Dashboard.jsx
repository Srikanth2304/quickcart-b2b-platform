import { useEffect, useState } from "react";
import ManufacturerSidebar from "../../components/manufacturer/ManufacturerSidebar";
import { getMyProducts } from "../../services/manufacturerService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";
import "./manufacturer.css";

export default function ManufacturerDashboardPage() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    async function load() {
      try {
        const result = await getMyProducts(0, 500);
        const products = result.content || [];
        const activeCount = products.filter((item) => {
          if (typeof item?.isActive === "boolean") return item.isActive;
          return String(item?.status || "").toUpperCase() === "ACTIVE";
        }).length;
        setStats({
          total: products.length,
          active: activeCount,
          inactive: products.length - activeCount,
        });
      } catch (error) {
        if (error?.response?.data) console.error(error.response.data);
        showToast("Operation failed. Check logs.", "error");
      }
    }
    load();
  }, []);

  return (
    <ManufacturerSidebar title="Manufacturer Dashboard">
      <div className="mf-grid">
        <div className="sa-banner">Manage products and keep your catalog updated.</div>
        <section className="mf-stats">
          <article className="mf-card">
            <p>Total Products</p>
            <h3>{stats.total}</h3>
          </article>
          <article className="mf-card">
            <p>Active Products</p>
            <h3>{stats.active}</h3>
          </article>
          <article className="mf-card">
            <p>Inactive Products</p>
            <h3>{stats.inactive}</h3>
          </article>
        </section>
      </div>
    </ManufacturerSidebar>
  );
}
