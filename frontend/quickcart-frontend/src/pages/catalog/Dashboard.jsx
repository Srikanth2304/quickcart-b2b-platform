import { useEffect, useState } from "react";
import CatalogSidebar from "../../components/catalog/CatalogSidebar";
import { getCategories, getPendingUsers } from "../../services/catalogService";
import { showToast } from "../../utils/notify";
import "../superAdmin/superAdmin.css";
import "./catalog.css";

export default function CatalogDashboard() {
  const [counts, setCounts] = useState({ pending: 0, categories: 0, brands: 0 });

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [pendingUsers, categories] = await Promise.all([
          getPendingUsers(),
          getCategories(),
        ]);
        if (!isMounted) return;

        const brandIds = new Set();
        categories.forEach((item) => {
          const id = item?.brandId || item?.brand?.id || item?.brand;
          if (id) brandIds.add(String(id));
        });

        setCounts({
          pending: pendingUsers.length,
          categories: categories.length,
          brands: brandIds.size,
        });
      } catch (error) {
        if (error?.response?.data) {
          console.error(error.response.data);
        }
        showToast("API Error. Please check backend logs.", "error");
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <CatalogSidebar title="Catalog Manager Dashboard">
      <div className="catalog-grid">
        <div className="sa-banner">Welcome CATALOG_MANAGER</div>
        <section className="catalog-cards">
          <article className="catalog-card">
            <p>Pending Users Count</p>
            <h3>{counts.pending}</h3>
          </article>
          <article className="catalog-card">
            <p>Categories Count</p>
            <h3>{counts.categories}</h3>
          </article>
          <article className="catalog-card">
            <p>Brands Count</p>
            <h3>{counts.brands}</h3>
          </article>
        </section>
      </div>
    </CatalogSidebar>
  );
}
