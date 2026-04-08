import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Loader from "../components/Loader";
import "./RetailerOrders.css";

/* ── Helpers ── */
function formatCurrency(v) {
  if (v == null || Number.isNaN(Number(v))) return "–";
  return Number(v).toLocaleString("en-IN");
}

function formatDate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function timeAgo(d) {
  if (!d) return "";
  try {
    const now = Date.now();
    const then = new Date(d).getTime();
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(d);
  } catch {
    return "";
  }
}

function normalizeOrderStatus(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s === "PAID") return "CONFIRMED";
  return s;
}

/* Status config */
const STATUS_MAP = {
  PAYMENT_PENDING:  { label: "Payment Pending",  color: "#f59e0b", bg: "#fffbeb", icon: "⏳" },
  CREATED:          { label: "Created",          color: "#6b7280", bg: "#f3f4f6", icon: "📝" },
  CONFIRMED:        { label: "Confirmed",        color: "#6c5ce7", bg: "#f0edff", icon: "✓" },
  ACCEPTED:         { label: "Accepted",         color: "#6c5ce7", bg: "#f0edff", icon: "✓" },
  SHIPPED:          { label: "Shipped",          color: "#2563eb", bg: "#eff6ff", icon: "🚚" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "#f59e0b", bg: "#fffbeb", icon: "📦" },
  DELIVERED:        { label: "Delivered",        color: "#16a34a", bg: "#f0fdf4", icon: "✅" },
  CANCELLED:        { label: "Cancelled",        color: "#dc2626", bg: "#fef2f2", icon: "✕" },
  REJECTED:         { label: "Rejected",         color: "#dc2626", bg: "#fef2f2", icon: "✕" },
};

function getStatusConfig(status) {
  const s = normalizeOrderStatus(status);
  if (s.includes("DELIVER") && !s.includes("OUT")) return STATUS_MAP.DELIVERED;
  if (s.includes("OUT")) return STATUS_MAP.OUT_FOR_DELIVERY;
  if (s.includes("SHIP")) return STATUS_MAP.SHIPPED;
  if (s.includes("CANCEL")) return STATUS_MAP.CANCELLED;
  if (s.includes("REJECT")) return STATUS_MAP.REJECTED;
  if (s.includes("ACCEPT")) return STATUS_MAP.ACCEPTED;
  if (s === "PAYMENT_PENDING") return STATUS_MAP.PAYMENT_PENDING;
  return STATUS_MAP[s] || STATUS_MAP.CONFIRMED;
}

/* Mini tracking steps */
function getStepProgress(status) {
  const s = normalizeOrderStatus(status);
  if (s.includes("DELIVER") && !s.includes("OUT")) return 5;
  if (s.includes("OUT")) return 4;
  if (s.includes("SHIP")) return 3;
  if (s.includes("ACCEPT")) return 2;
  if (s.includes("CONFIRM")) return 1;
  if (s.includes("CANCEL") || s.includes("REJECT")) return -1;
  return 0; // PAYMENT_PENDING or CREATED
}

/* Refund helpers */
function isRefundPending(status) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "PENDING_APPROVAL";
}

function unwrapApiData(responseData) {
  if (!responseData || typeof responseData !== "object") return responseData;
  if (responseData.data !== undefined) return responseData.data;
  return responseData;
}

const REFUND_CONFIG = {
  PENDING_APPROVAL: { label: "Refund Requested",   icon: "⏳", color: "#f59e0b", bg: "#fffbeb" },
  APPROVED:         { label: "Refund Approved",    icon: "🔄", color: "#6c5ce7", bg: "#f0edff" },
  PROCESSING:       { label: "Refund Processing",  icon: "🔄", color: "#2563eb", bg: "#eff6ff" },
  PROCESSED:        { label: "Refund Completed",   icon: "✅", color: "#16a34a", bg: "#f0fdf4" },
  REJECTED:         { label: "Refund Rejected",    icon: "❌", color: "#dc2626", bg: "#fef2f2" },
  FAILED:           { label: "Refund Failed",      icon: "❌", color: "#dc2626", bg: "#fef2f2" },
};

function getRefundConfig(status) {
  if (isRefundPending(status)) return REFUND_CONFIG.PENDING_APPROVAL;
  return REFUND_CONFIG[(status || "").toUpperCase()] || null;
}

/* Tab → API status param mapping */
const FILTER_TABS = [
  { key: "all",       label: "All Orders", status: null },
  { key: "active",    label: "Active",     status: "ACTIVE" },
  { key: "delivered", label: "Delivered",  status: "DELIVERED" },
  { key: "cancelled", label: "Cancelled",  status: "CANCELLED" },
];

const SORT_OPTIONS = [
  { key: "createdAt,desc", label: "Newest First" },
  { key: "createdAt,asc",  label: "Oldest First" },
  { key: "totalAmount,desc", label: "Amount: High → Low" },
  { key: "totalAmount,asc",  label: "Amount: Low → High" },
];

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

export default function RetailerOrders() {
  const navigate = useNavigate();

  /* ── Server-driven state ── */
  const [summary, setSummary] = useState({ total: 0, active: 0, delivered: 0, cancelled: 0 });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productImages, setProductImages] = useState({});
  const [refundMap, setRefundMap] = useState({});  // { orderId: refundData }

  /* ── UI state ── */
  const [selectedTab, setSelectedTab] = useState("all");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("createdAt,desc");
  const searchTimerRef = useRef(null);

  /* ── Fetch summary counts (once on mount) ── */
  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const res = await api.get("/orders/summary");
        if (isMounted && res?.data) {
          const payload = unwrapApiData(res.data) || {};
          setSummary({
            total: payload.total ?? 0,
            active: payload.active ?? 0,
            delivered: payload.delivered ?? 0,
            cancelled: payload.cancelled ?? 0,
          });
        }
      } catch {
        /* summary fetch failed — counts stay 0 */
      }
    };
    fetchSummary();
    return () => { isMounted = false; };
  }, []);

  /* ── Debounced search: update debouncedSearch after delay ── */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  /* ── Fetch paginated orders (all filtering/searching/sorting is server-side) ── */
  const fetchOrders = useCallback(async (tab, pageNum, searchQuery, sortParam) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pageNum, size: PAGE_SIZE };
      const statusParam = FILTER_TABS.find((t) => t.key === tab)?.status;
      if (statusParam) params.status = statusParam;
      if (searchQuery) params.search = searchQuery;
      if (sortParam) params.sort = sortParam;

      const res = await api.get("/orders", { params });
      const resData = unwrapApiData(res?.data) || {};
      const data = Array.isArray(resData) ? resData : resData.content || resData.orders || [];

      setOrders(data);
      setTotalPages(resData.totalPages || 1);
      setTotalElements(resData.totalElements || data.length);

      /* Gather unique product IDs & fetch images */
      const pIds = new Set();
      data.forEach((o) =>
        (o.items || o.orderItems || []).forEach((i) => {
          if (i.productId) pIds.add(i.productId);
        })
      );

      /* Only fetch images we don't already have */
      const newPids = [...pIds].filter((pid) => !productImages[pid]);
      if (newPids.length > 0) {
        const imgMap = { ...productImages };
        await Promise.allSettled(
          newPids.map(async (pid) => {
            try {
              const pRes = await api.get(`/products/${pid}`);
              const p = unwrapApiData(pRes?.data) || {};
              imgMap[pid] = {
                imageUrl: p?.imageUrl || p?.image || p?.thumbnail || "",
                brand: p?.brand || "",
                name: p?.name || "",
              };
            } catch { /* skip */ }
          })
        );
        setProductImages(imgMap);
      }

      /* Fetch refund info for cancelled/rejected paid orders */
      const cancelledOrders = data.filter((o) => {
        const s = (o.status || "").toUpperCase();
        const isCancelledOrRejected = s.includes("CANCEL") || s.includes("REJECT");
        if (!isCancelledOrRejected) return false;
        // No refund for COD orders
        if ((o.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY") return false;
        const hasPaid = o.paymentId || o.paymentStatus || o.payment?.paymentId;
        return !!hasPaid;
      });
      if (cancelledOrders.length > 0) {
        const rMap = { ...refundMap };
        await Promise.allSettled(
          cancelledOrders.map(async (o) => {
            if (rMap[o.id]) return;
            try {
              const rRes = await api.get(`/orders/${o.id}/refund`);
              const refundPayload = unwrapApiData(rRes?.data);
              if (refundPayload) rMap[o.id] = refundPayload;
            } catch { /* no refund exists */ }
          })
        );
        setRefundMap(rMap);
      }
    } catch {
      setError("Unable to load your orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [productImages]);

  /* Trigger fetch when tab, page, search, or sort changes */
  useEffect(() => {
    fetchOrders(selectedTab, page, debouncedSearch, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, page, debouncedSearch, sort]);

  /* ── Tab switch handler ── */
  const handleTabChange = (tabKey) => {
    if (tabKey === selectedTab) return;
    setSelectedTab(tabKey);
    setPage(0);
  };

  /* ── Sort change handler ── */
  const handleSortChange = (value) => {
    setSort(value);
    setPage(0);
  };

  /* All results come directly from the server — no client-side filtering */
  const displayOrders = orders;

  /* ── Refresh summary after navigating back ── */
  const refreshSummary = async () => {
    try {
      const res = await api.get("/orders/summary");
      if (res?.data) {
        const payload = unwrapApiData(res.data) || {};
        setSummary({
          total: payload.total ?? 0,
          active: payload.active ?? 0,
          delivered: payload.delivered ?? 0,
          cancelled: payload.cancelled ?? 0,
        });
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="ro-page">
      <div className="ro-container">

        {/* ══════ Header ══════ */}
        <header className="ro-header">
          <div className="ro-header-left">
            <h1 className="ro-title">My Orders</h1>
            <p className="ro-subtitle">{summary.total} order{summary.total !== 1 ? "s" : ""} placed</p>
          </div>
          <div className="ro-header-stats">
            <div className="ro-stat ro-stat--active">
              <span className="ro-stat-num">{summary.active}</span>
              <span className="ro-stat-label">Active</span>
            </div>
            <div className="ro-stat ro-stat--delivered">
              <span className="ro-stat-num">{summary.delivered}</span>
              <span className="ro-stat-label">Delivered</span>
            </div>
            <div className="ro-stat ro-stat--cancelled">
              <span className="ro-stat-num">{summary.cancelled}</span>
              <span className="ro-stat-label">Cancelled</span>
            </div>
          </div>
        </header>

        {/* ══════ Toolbar ══════ */}
        <div className="ro-toolbar">
          <div className="ro-tabs">
            {FILTER_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`ro-tab ${selectedTab === t.key ? "ro-tab--active" : ""}`}
                onClick={() => handleTabChange(t.key)}
              >
                {t.label}
                {t.key === "all" && <span className="ro-tab-count">{summary.total}</span>}
                {t.key === "active" && summary.active > 0 && <span className="ro-tab-count ro-tab-count--active">{summary.active}</span>}
                {t.key === "delivered" && summary.delivered > 0 && <span className="ro-tab-count ro-tab-count--delivered">{summary.delivered}</span>}
                {t.key === "cancelled" && summary.cancelled > 0 && <span className="ro-tab-count ro-tab-count--cancelled">{summary.cancelled}</span>}
              </button>
            ))}
          </div>

          <div className="ro-toolbar-right">
            <div className="ro-search-box">
              <svg className="ro-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                className="ro-search-input"
                placeholder="Search orders, products…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button type="button" className="ro-search-clear" onClick={() => setSearchTerm("")}>✕</button>
              )}
            </div>
            <select
              className="ro-sort-select"
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ══════ Content ══════ */}
        {loading && (
          <div className="ro-loading">
            <Loader size="lg" text="Loading orders…" />
          </div>
        )}

        {!loading && error && (
          <div className="ro-error">
            <span className="ro-error-icon">⚠️</span>
            <span>{error}</span>
            <button type="button" className="ro-error-retry" onClick={() => fetchOrders(selectedTab, page, debouncedSearch, sort)}>Retry</button>
          </div>
        )}

        {!loading && !error && displayOrders.length === 0 && (
          <div className="ro-empty">
            <div className="ro-empty-icon">🛒</div>
            <div className="ro-empty-title">
              {searchTerm ? "No matching orders" : selectedTab !== "all" ? `No ${selectedTab} orders` : "No orders yet"}
            </div>
            <div className="ro-empty-desc">
              {searchTerm
                ? "Try a different search term"
                : "When you place orders, they'll appear here"}
            </div>
            {!searchTerm && selectedTab === "all" && (
              <button type="button" className="ro-empty-btn" onClick={() => navigate("/retailer/products")}>
                Browse Products
              </button>
            )}
          </div>
        )}

        {!loading && !error && displayOrders.length > 0 && (
          <div className="ro-orders">
            {displayOrders.map((order) => {
              const items = order.items || order.orderItems || [];
              const totalAmount = order.totalAmount || order.amount || 0;
              const sc = getStatusConfig(order.status);
              const isCancelled = (order.status || "").toUpperCase().includes("CANCEL") || (order.status || "").toUpperCase().includes("REJECT");
              const isDelivered = (order.status || "").toUpperCase().includes("DELIVER") && !(order.status || "").toUpperCase().includes("OUT");
              const stepProgress = getStepProgress(order.status);
              const orderDate = order.createdAt || order.orderDate || "";

              return (
                <div
                  className="ro-order-card"
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/orders/${order.id}`)}
                >
                  {/* Card top bar */}
                  <div className="ro-card-top">
                    <div className="ro-card-meta">
                      <span className="ro-card-order-id">Order #{order.id}</span>
                      <span className="ro-card-dot">·</span>
                      <span className="ro-card-date">{formatDate(orderDate)}</span>
                      <span className="ro-card-dot">·</span>
                      <span className="ro-card-ago">{timeAgo(orderDate)}</span>
                    </div>
                    <div
                      className="ro-card-status"
                      style={{ background: sc.bg, color: sc.color, borderColor: `${sc.color}25` }}
                    >
                      <span className="ro-card-status-icon">{sc.icon}</span>
                      {sc.label}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="ro-card-items">
                    {items.slice(0, 3).map((item, idx) => {
                      const pData = productImages[item.productId] || {};
                      const name = item.productName || pData.name || "Product";
                      const img = pData.imageUrl || item.imageUrl || "";
                      const brand = pData.brand || "";
                      const price = item.price || item.unitPrice || 0;
                      const qty = item.quantity || 1;

                      return (
                        <div className="ro-item" key={item.id || item.productId || idx}>
                          {img ? (
                            <img className="ro-item-img" src={img} alt={name} />
                          ) : (
                            <div className="ro-item-img-placeholder">
                              {name.charAt(0)}
                            </div>
                          )}
                          <div className="ro-item-info">
                            <div className="ro-item-name">{name}</div>
                            {brand && <div className="ro-item-brand">{brand}</div>}
                            <div className="ro-item-bottom">
                              <span className="ro-item-price">₹{formatCurrency(price)}</span>
                              {qty > 1 && <span className="ro-item-qty">× {qty}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <div className="ro-items-more">+{items.length - 3} more item{items.length - 3 > 1 ? "s" : ""}</div>
                    )}
                    {items.length === 0 && (
                      <div className="ro-item">
                        <div className="ro-item-img-placeholder">O</div>
                        <div className="ro-item-info">
                          <div className="ro-item-name">Order #{order.id}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mini progress tracker (non-cancelled only) */}
                  {!isCancelled && (
                    <div className="ro-mini-tracker">
                      {["Placed", "Confirmed", "Accepted", "Shipped", "Delivered"].map((step, i) => {
                        const filled = stepProgress > i;
                        const current = stepProgress === i;
                        return (
                          <div className="ro-mini-step" key={step}>
                            <div className={`ro-mini-dot ${filled ? "ro-mini-dot--filled" : ""} ${current ? "ro-mini-dot--current" : ""}`} />
                            {i < 4 && <div className={`ro-mini-line ${filled && stepProgress > i + 1 ? "ro-mini-line--filled" : ""}`} />}
                            <span className={`ro-mini-label ${current ? "ro-mini-label--current" : ""} ${filled ? "ro-mini-label--filled" : ""}`}>{step}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Cancelled badge */}
                  {isCancelled && (
                    <div className="ro-cancelled-strip">
                      <span className="ro-cancelled-icon">✕</span>
                      Order was cancelled{order.cancelledAt ? ` on ${formatDate(order.cancelledAt)}` : ""}
                    </div>
                  )}

                  {/* Refund status badge (cancelled orders — online payments only) */}
                  {isCancelled && !((order?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY") && refundMap[order.id] && (() => {
                    const refund = refundMap[order.id];
                    const rc = getRefundConfig(refund.status);
                    if (!rc) return null;
                    return (
                      <div
                        className="ro-refund-strip"
                        style={{ background: rc.bg, borderColor: `${rc.color}30` }}
                      >
                        <span className="ro-refund-strip-icon">{rc.icon}</span>
                        <span className="ro-refund-strip-label" style={{ color: rc.color }}>{rc.label}</span>
                        {refund.amount != null && (
                          <span className="ro-refund-strip-amount" style={{ color: rc.color }}>₹{formatCurrency(refund.amount)}</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* COD payment badge */}
                  {(order?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY" && (
                    <div className="ro-cod-strip">
                      <span className="ro-cod-icon">💵</span>
                      <span className="ro-cod-label">Cash on Delivery</span>
                      {(order?.paymentStatus || order?.payment?.status || "").toUpperCase() === "COLLECTED" ? (
                        <span className="ro-cod-status ro-cod-status--collected">🟢 Collected</span>
                      ) : (
                        <span className="ro-cod-status ro-cod-status--pending">🟡 Pending Collection</span>
                      )}
                    </div>
                  )}

                  {/* Rate prompt for delivered orders */}
                  {isDelivered && (
                    <div
                      className="ro-rate-strip"
                      onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}`); }}
                    >
                      <span className="ro-rate-strip-stars">★★★★★</span>
                      <span className="ro-rate-strip-text">Rate & Review Product</span>
                      <span className="ro-rate-strip-arrow">›</span>
                    </div>
                  )}

                  {/* Card footer */}
                  <div className="ro-card-footer">
                    <div className="ro-card-total">
                      <span className="ro-card-total-label">Total</span>
                      <span className="ro-card-total-amount">₹{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="ro-card-footer-right">
                      {order.manufacturerName && (
                        <span className="ro-card-seller">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          {order.manufacturerName}
                        </span>
                      )}
                      <span className="ro-card-arrow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════ Pagination ══════ */}
        {!loading && !error && totalPages > 1 && (
          <div className="ro-pagination">
            <button
              type="button"
              className="ro-page-btn"
              disabled={page === 0}
              onClick={() => setPage(0)}
              aria-label="First page"
            >
              «
            </button>
            <button
              type="button"
              className="ro-page-btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
              .reduce((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push(-1);
                acc.push(i);
                return acc;
              }, [])
              .map((i, idx) =>
                i === -1 ? (
                  <span key={`ellipsis-${idx}`} className="ro-page-ellipsis">…</span>
                ) : (
                  <button
                    key={i}
                    type="button"
                    className={`ro-page-btn ro-page-num ${page === i ? "ro-page-num--active" : ""}`}
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </button>
                )
              )}

            <button
              type="button"
              className="ro-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
            >
              ›
            </button>
            <button
              type="button"
              className="ro-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
              aria-label="Last page"
            >
              »
            </button>

            <span className="ro-page-info">
              Page {page + 1} of {totalPages} · {totalElements} order{totalElements !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
