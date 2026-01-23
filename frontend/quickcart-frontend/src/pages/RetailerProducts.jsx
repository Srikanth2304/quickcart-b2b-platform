import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "./RetailerProducts.css";

export default function RetailerProducts() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState(() => new Set());
  const [sortBy, setSortBy] = useState("recommended");
  const pageSize = 12;

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/products?page=${page}&size=${pageSize}`);
        if (!isMounted) return;
        const data = response.data || {};
        setProducts(data.content || []);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to load products. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, [page]);

  const pageInfo = useMemo(() => {
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalElements || 0);
    return totalElements > 0 ? `${start}-${end} of ${totalElements} items` : "0 items";
  }, [page, pageSize, totalElements]);

  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (sortBy === "recommended") return products;

    const list = [...products];
    const getNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
    const getPrice = (product) => getNumber(product?.price ?? product?.sellingPrice ?? product?.salePrice);

    switch (sortBy) {
      case "priceHigh":
        return list.sort((a, b) => getPrice(b) - getPrice(a));
      case "priceLow":
        return list.sort((a, b) => getPrice(a) - getPrice(b));
      default:
        return list;
    }
  }, [products, sortBy]);

  return (
    <div className="retailer-products-layout">
      <div className="retailer-products-top">
        <div className="retailer-products-breadcrumb">
          Home / Products / <span>Retailer Products</span>
        </div>
        <div className="retailer-products-titleRow">
          <h2>Retailer Products</h2>
          <span className="retailer-products-count">{totalElements} items</span>
        </div>
      </div>

      <div className="retailer-products-content">
        <aside className="retailer-products-filters">
          <div className="filters-header">Filters</div>
          <div className="filters-section">
            <div className="filters-title">Availability</div>
            <label className="filters-option">
              <input type="checkbox" defaultChecked /> In Stock
            </label>
            <label className="filters-option">
              <input type="checkbox" /> Out of Stock
            </label>
          </div>
          <div className="filters-section">
            <div className="filters-title">Status</div>
            <label className="filters-option">
              <input type="checkbox" defaultChecked /> Active
            </label>
            <label className="filters-option">
              <input type="checkbox" /> Inactive
            </label>
          </div>
          <div className="filters-section">
            <div className="filters-title">Price</div>
            <label className="filters-option">
              <input type="checkbox" /> Under ₹2,000
            </label>
            <label className="filters-option">
              <input type="checkbox" /> ₹2,000 - ₹5,000
            </label>
            <label className="filters-option">
              <input type="checkbox" /> ₹5,000+
            </label>
          </div>
        </aside>

        <section className="retailer-products-main">
          <div className="retailer-products-toolbar">
            <div className="toolbar-left">{pageInfo}</div>
            <div className="toolbar-right">
              <label htmlFor="sort" className="toolbar-label">
                Sort by:
              </label>
              <div className="toolbar-select-wrapper">
                <select
                  id="sort"
                  className="toolbar-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="priceLow">Price: Low to High</option>
                </select>
              </div>
            </div>
          </div>

          {error && <div className="retailer-products-error">{error}</div>}

          {loading ? (
            <div className="retailer-products-state">Loading products...</div>
          ) : (
            <div className="retailer-products-grid">
              {sortedProducts.map((product) => (
                <div key={product.id} className="product-card">
                  <button
                    className={`product-wishlist ${wishlist.has(product.id) ? "active" : ""}`}
                    aria-label="Add to wishlist"
                    onClick={() =>
                      setWishlist((prev) => {
                        const next = new Set(prev);
                        if (next.has(product.id)) {
                          next.delete(product.id);
                        } else {
                          next.add(product.id);
                        }
                        return next;
                      })
                    }
                  >
                    {wishlist.has(product.id) ? "♥" : "♡"}
                  </button>
                  <a
                    className="product-card-link"
                    href={`/retailer/products/${product.id}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(
                          `retailer-product-${product.id}`,
                          JSON.stringify(product)
                        );
                      } catch (storageError) {
                        // Ignore storage errors
                      }
                    }}
                  >
                    <div className="product-card-image">
                      <div className="product-rating">
                        <span className="rating-value">4.4</span>
                        <span className="rating-dot">•</span>
                        <span className="rating-count">2.8k</span>
                      </div>
                      <div className="product-image-placeholder">
                        <span>{product.name?.charAt(0) || "P"}</span>
                      </div>
                    </div>
                    <div className="product-card-body">
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc">{product.description}</div>
                      <div className="product-price">₹ {product.price?.toLocaleString()}</div>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="retailer-products-pagination">
            <button
              className="retailer-products-pageBtn"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              Prev
            </button>
            <span className="retailer-products-pageInfo">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="retailer-products-pageBtn"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
