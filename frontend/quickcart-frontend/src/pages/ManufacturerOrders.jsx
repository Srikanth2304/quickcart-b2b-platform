import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { showToast } from "../utils/notify";
import Loader from "../components/Loader";
import "./ManufacturerOrders.css";

function unwrapApiData(responseData) {
  if (!responseData || typeof responseData !== "object") return responseData;
  if (responseData.data !== undefined) return responseData.data;
  return responseData;
}

function normalizeOrderStatus(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s === "PAID") return "CONFIRMED";
  return s;
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "-";
  return Number(value).toLocaleString("en-IN");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const datePart = d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return dateStr;
  }
}

const STATUS_COLORS = {
  PAYMENT_PENDING:  { bg: "#fffbeb", color: "#f59e0b", label: "Payment Pending" },
  CREATED:          { bg: "#f3f4f6", color: "#6b7280", label: "Created" },
  CONFIRMED:        { bg: "#f0edff", color: "#6c5ce7", label: "Confirmed" },
  ACCEPTED:         { bg: "#eff6ff", color: "#2563eb", label: "Accepted" },
  SHIPPED:          { bg: "#e8f4ff", color: "#2196f3", label: "Shipped" },
  OUT_FOR_DELIVERY: { bg: "#fff8e1", color: "#f39c12", label: "Out for Delivery" },
  DELIVERED:        { bg: "#e8fdf0", color: "#27ae60", label: "Delivered" },
  CANCELLED:        { bg: "#fff0f0", color: "#e53935", label: "Cancelled" },
  REJECTED:         { bg: "#fff0f0", color: "#e53935", label: "Rejected" },
};

const FILTER_OPTIONS = ["All", "Payment Pending", "Confirmed", "Accepted", "Shipped", "Delivered", "Cancelled", "Rejected"];

function isRefundPending(status) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "PENDING_APPROVAL";
}

/* Lifecycle actions a manufacturer can take per status */
function getLifecycleActions(status) {
  const s = normalizeOrderStatus(status);
  if (s === "PAYMENT_PENDING") return ["cancel"];
  if (s === "CONFIRMED") return ["accept", "reject", "cancel"];
  if (s === "ACCEPTED") return ["ship", "cancel"];
  if (s === "SHIPPED") return ["deliver"];
  return [];
}

const ACTION_CONFIG = {
  accept:  { label: "Accept Order",    icon: "✓",  className: "mo-lifecycle-btn--accept",  confirmTitle: "Accept this order?",  confirmDesc: "This will move the order to ACCEPTED. You'll need to prepare it for shipment.",  confirmIcon: "✅" },
  reject:  { label: "Reject Order",    icon: "✕",  className: "mo-lifecycle-btn--reject",  confirmTitle: "Reject this order?",  confirmDesc: "This will reject the order. If paid online, a refund will be automatically initiated. This action cannot be undone.",  confirmIcon: "⚠️" },
  ship:    { label: "Mark Shipped",    icon: "🚚", className: "mo-lifecycle-btn--ship",    confirmTitle: "Mark as shipped?",    confirmDesc: "Confirm that this order has been shipped. The retailer will be notified.",  confirmIcon: "🚚" },
  deliver: { label: "Mark Delivered",  icon: "📦", className: "mo-lifecycle-btn--deliver", confirmTitle: "Mark as delivered?",  confirmDesc: "Confirm that this order has been delivered to the retailer.",  confirmIcon: "📦" },
  cancel:  { label: "Cancel Order",    icon: "⊘",  className: "mo-lifecycle-btn--cancel",  confirmTitle: "Cancel this order?",  confirmDesc: "This will cancel the order and restore stock. If paid online, a refund will be processed. This cannot be undone.",  confirmIcon: "🚫" },
};

const LIFECYCLE_ENDPOINTS = {
  accept:  (id) => `/orders/${id}/accept`,
  reject:  (id) => `/orders/${id}/reject`,
  ship:    (id) => `/orders/${id}/shipment`,
  deliver: (id) => `/orders/${id}/deliver`,
  cancel:  (id) => `/orders/${id}/cancel`,
};

const SORT_OPTIONS = [
  { key: "createdAt,desc", label: "Newest First" },
  { key: "createdAt,asc",  label: "Oldest First" },
  { key: "totalAmount,desc", label: "Amount: High → Low" },
  { key: "totalAmount,asc",  label: "Amount: Low → High" },
];

const SEARCH_DEBOUNCE_MS = 400;

export default function ManufacturerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("createdAt,desc");
  const searchTimerRef = useRef(null);

  // Server-driven pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 10;

  // Server-driven summary counts
  const [summary, setSummary] = useState({ total: 0, active: 0, delivered: 0, cancelled: 0 });

  // Refund data per order
  const [refunds, setRefunds] = useState({});
  const [refundActions, setRefundActions] = useState({});

  // Lifecycle action in-progress tracker { orderId: 'accept'|'ship'|... }
  const [lifecycleActions, setLifecycleActions] = useState({});

  // Confirmation modal — now supports lifecycle + refund actions
  const [confirmModal, setConfirmModal] = useState(null); // { orderId, action, type: 'lifecycle'|'refund' }

  /* Fetch summary counts from backend (never compute on frontend) */
  const fetchSummary = async () => {
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
    } catch { /* summary fetch failed — counts stay 0 */ }
  };

  useEffect(() => { fetchSummary(); }, []);

  /* Debounced search: update debouncedSearch after delay */
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(0);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchTerm]);

  const fetchOrders = async (pageNum = 0) => {
    setLoading(true);
    setError("");
    try {
      const params = { page: pageNum, size: PAGE_SIZE };
      // Map filter tab to backend status param
      if (filter !== "All") {
        const statusParam = filter.toUpperCase().replace(/\s+/g, "_");
        params.status = statusParam;
      }
      if (debouncedSearch) params.search = debouncedSearch;
      if (sort) params.sort = sort;

      const res = await api.get("/orders", { params });
  const resData = unwrapApiData(res?.data) || {};
      const data = Array.isArray(resData) ? resData : resData.content || resData.orders || [];
      setOrders(data);
      setTotalPages(resData.totalPages || 1);
      setTotalElements(resData.totalElements || data.length);

      // Fetch refund data for cancelled/rejected orders that had a payment
      const refundEligible = data.filter((o) => {
        const s = (o.status || "").toUpperCase();
        const isCancelledOrRejected = s.includes("CANCEL") || s.includes("REJECT");
        if (!isCancelledOrRejected) return false;
        // No refund for COD orders
        if ((o.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY") return false;
        // Only fetch refund if order was paid (has payment info)
        const hasPaid = o.paymentId || o.paymentStatus || o.payment?.paymentId;
        return !!hasPaid;
      });

      if (refundEligible.length > 0) {
        const refundMap = { ...refunds };
        await Promise.allSettled(
          refundEligible.map(async (o) => {
            if (refundMap[o.id]) return; // already cached
            try {
              const rRes = await api.get(`/orders/${o.id}/refund`);
              refundMap[o.id] = unwrapApiData(rRes?.data) || null;
            } catch {
              // no refund exists or fetch failed — ignore
            }
          })
        );
        setRefunds(refundMap);
      }
    } catch {
      setError("Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, debouncedSearch, sort]);

  const handleRefundAction = async (orderId, action) => {
    setConfirmModal(null);
    setRefundActions((prev) => ({ ...prev, [orderId]: action }));
    try {
      await api.post(`/orders/${orderId}/refund/${action}`);
      // Refetch refund data for this order
      try {
        const rRes = await api.get(`/orders/${orderId}/refund`);
        setRefunds((prev) => ({ ...prev, [orderId]: unwrapApiData(rRes?.data) || null }));
      } catch (err) {
        if (err?.response?.status === 404) {
          // Refund record not found — clear it
          setRefunds((prev) => ({ ...prev, [orderId]: null }));
        } else {
          // Non-404 error — update optimistically
          setRefunds((prev) => ({
            ...prev,
            [orderId]: prev[orderId]
              ? { ...prev[orderId], status: action === "approve" ? "APPROVED" : "REJECTED" }
              : null,
          }));
        }
      }
    } catch (err) {
      showToast(err?.response?.data?.message || `Failed to ${action} refund. Please try again.`, "error");
    } finally {
      setRefundActions((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  /* ── Lifecycle action handler ── */
  const handleLifecycleAction = async (orderId, action) => {
    setConfirmModal(null);
    setLifecycleActions((prev) => ({ ...prev, [orderId]: action }));
    try {
      const endpoint = LIFECYCLE_ENDPOINTS[action];
      if (!endpoint) return;
      if (action === "deliver") {
        const orderRow = orders.find((o) => String(o?.id) === String(orderId));
        const shipmentId =
          orderRow?.shipment?.id ||
          orderRow?.shipmentId ||
          orderRow?.shipment?.shipmentId ||
          null;
        const payload = { status: "DELIVERED" };
        console.log("=== Shipment Update Triggered ===");
        console.log("Shipment ID:", shipmentId);
        console.log("Payload:", payload);
        console.log("API URL:", shipmentId ? `/shipments/${shipmentId}` : "N/A (shipmentId missing)");
        if (!shipmentId) {
          console.error("Shipment ID is missing — cannot update shipment");
        }
        console.log("Lifecycle API actually called:", endpoint(orderId));
      }

      const response = await api.post(endpoint(orderId));
      if (action === "deliver") {
        console.log("Shipment Update Response:", response?.data);
      }
      // Re-fetch the single order to get updated status
      try {
        const res = await api.get(`/orders/${orderId}`);
        const orderPayload = unwrapApiData(res?.data);
        if (orderPayload) {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...orderPayload } : o)));
        }
      } catch {
        // Fallback: refetch current page
        fetchOrders(page);
      }
      // If the action was reject or cancel, fetch refund info (refund may be auto-created)
      if (action === "reject" || action === "cancel") {
        try {
          const rRes = await api.get(`/orders/${orderId}/refund`);
          setRefunds((prev) => ({ ...prev, [orderId]: unwrapApiData(rRes?.data) || null }));
        } catch {
          // no refund record created yet — ignore
        }
      }
      // Refresh summary counts from backend
      fetchSummary();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || `Failed to ${action} order.`;
      showToast(msg, "error");
    } finally {
      setLifecycleActions((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  /* All results come directly from the server — no client-side filtering */
  const filteredOrders = orders;

  const getStatusStyle = (status) => {
    const s = normalizeOrderStatus(status);
    if (s.includes("REJECT")) return STATUS_COLORS.REJECTED;
    if (s.includes("CANCEL")) return STATUS_COLORS.CANCELLED;
    if (s.includes("DELIVER") && !s.includes("OUT")) return STATUS_COLORS.DELIVERED;
    if (s.includes("OUT")) return STATUS_COLORS.OUT_FOR_DELIVERY;
    if (s.includes("SHIP")) return STATUS_COLORS.SHIPPED;
    if (s.includes("ACCEPT")) return STATUS_COLORS.ACCEPTED;
    if (s.includes("CONFIRM")) return STATUS_COLORS.CONFIRMED;
    if (s === "PAYMENT_PENDING") return STATUS_COLORS.PAYMENT_PENDING;
    if (s === "CREATED") return STATUS_COLORS.CREATED;
    return STATUS_COLORS.CREATED;
  };

  return (
    <div className="mo-page">
      <div className="mo-container">
        {/* Header */}
        <div className="mo-header">
          <div>
            <h1 className="mo-title">Retailer Orders</h1>
            <p className="mo-subtitle">
              Manage orders, lifecycle actions & refunds
            </p>
          </div>
          <div className="mo-stats">
            <div className="mo-stat">
              <span className="mo-stat-num">{summary.total}</span>
              <span className="mo-stat-label">Total</span>
            </div>
            <div className="mo-stat">
              <span className="mo-stat-num mo-stat-num--active">{summary.active}</span>
              <span className="mo-stat-label">Active</span>
            </div>
            <div className="mo-stat">
              <span className="mo-stat-num mo-stat-num--cancelled">{summary.cancelled}</span>
              <span className="mo-stat-label">Cancelled</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mo-toolbar">
          <div className="mo-filters">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f}
                type="button"
                className={`mo-filter-btn ${filter === f ? "mo-filter-btn--active" : ""}`}
                onClick={() => { setFilter(f); setPage(0); }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="mo-search-wrap">
            <span className="mo-search-icon">🔍</span>
            <input
              type="text"
              className="mo-search"
              placeholder="Search by order ID, retailer, product…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" className="mo-search-clear" onClick={() => setSearchTerm("")}>✕</button>
            )}
          </div>
          <select
            className="mo-sort-select"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(0); }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loading && <div className="mo-state"><Loader text="Loading orders…" /></div>}
        {!loading && error && <div className="mo-error">{error}</div>}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="mo-empty">
            <span className="mo-empty-icon">📦</span>
            <span>No orders found</span>
          </div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="mo-orders-list">
            {filteredOrders.map((order) => {
              const items = order.items || order.orderItems || [];
              const totalAmount = order.totalAmount || order.amount || 0;
              const statusStyle = getStatusStyle(order.status);
              const orderStatusUpper = normalizeOrderStatus(order.status);
              const isCancelled = orderStatusUpper.includes("CANCEL");
              const isRejected = orderStatusUpper.includes("REJECT");
              const isCancelledOrRejected = isCancelled || isRejected;
              const refund = refunds[order.id] || null;
              const refundPending = refund && isRefundPending(refund.status);
              const refundProcessing = refundActions[order.id];
              // Trust backend: if order was ever CONFIRMED or beyond, payment happened
              const isPaid = orderStatusUpper !== "PAYMENT_PENDING" && orderStatusUpper !== "CREATED";
              const isCodOrder = (order?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY";

              // Lifecycle actions available for this order
              const actions = getLifecycleActions(order.status);
              const lifecycleInProgress = lifecycleActions[order.id];

              return (
                <div
                  className="mo-order-card"
                  key={order.id}
                  onClick={() => navigate(`/manufacturer/orders/${order.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/manufacturer/orders/${order.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Card header */}
                  <div className="mo-order-header">
                    <div className="mo-order-id-row">
                      <span className="mo-order-id">Order #{order.id}</span>
                      <span
                        className="mo-status-badge"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          border: `1px solid ${statusStyle.color}22`,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <div className="mo-order-meta">
                      <span>Placed {formatDate(order.createdAt || order.orderDate)}</span>
                      {order.retailerName && (
                        <>
                          <span className="mo-meta-dot">·</span>
                          <span className="mo-retailer">
                            🏪 {order.retailerName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mo-items">
                    {items.map((item, idx) => (
                      <div className="mo-item" key={item.id || idx}>
                        <div className="mo-item-name">
                          {item.productName || item.name || "Product"}
                        </div>
                        <div className="mo-item-details">
                          <span>Qty: {item.quantity || 1}</span>
                          <span className="mo-item-price">
                            ₹{formatCurrency(item.price || item.unitPrice || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="mo-item">
                        <div className="mo-item-name">Order items</div>
                        <div className="mo-item-details">
                          <span className="mo-item-price">
                            ₹{formatCurrency(totalAmount)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mo-order-footer">
                    <div className="mo-total">
                      <span className="mo-total-label">Total</span>
                      <span className="mo-total-amount">
                        ₹{formatCurrency(totalAmount)}
                      </span>
                    </div>

                    {/* Payment info */}
                    <div className="mo-payment-info">
                      {isCodOrder ? (
                        <>
                          <span className="mo-payment-gateway">💵 Cash on Delivery</span>
                          {orderStatusUpper.includes("DELIVER") && !orderStatusUpper.includes("OUT") ? (
                            <span className="mo-payment-paid">Collected</span>
                          ) : (
                            <span className="mo-payment-pending">Pending Collection</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="mo-payment-gateway">💳 {order?.payment?.gateway || "Online"}</span>
                          {isPaid ? (
                            <span className="mo-payment-paid">Paid</span>
                          ) : (
                            <span className="mo-payment-pending">Awaiting Payment</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Lifecycle Action Buttons ── */}
                  {actions.length > 0 && (
                    <div className="mo-lifecycle-section" onClick={(e) => e.stopPropagation()}>
                      <div className="mo-lifecycle-label">Actions</div>
                      <div className="mo-lifecycle-actions">
                        {actions.map((action) => {
                          const cfg = ACTION_CONFIG[action];
                          if (!cfg) return null;
                          const isProcessing = lifecycleInProgress === action;
                          return (
                            <button
                              key={action}
                              type="button"
                              className={`mo-lifecycle-btn ${cfg.className}`}
                              disabled={!!lifecycleInProgress}
                              onClick={() => {
                                if (action === "deliver") {
                                  console.log("Mark Delivered button clicked");
                                }
                                setConfirmModal({ orderId: order.id, action, type: "lifecycle" });
                              }}
                            >
                              {isProcessing
                                ? `${cfg.label.replace(/^(\w+)/, "$1ing")}…`
                                : `${cfg.icon} ${cfg.label}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Refund Section (online payments only) */}
                  {isCancelledOrRejected && !isCodOrder && refund && (
                    <div className={`mo-refund-section mo-refund-section--${isRefundPending(refund.status) ? "pending" : (refund.status || "").toLowerCase()}`}>
                      <div className="mo-refund-top">
                        <span className="mo-refund-label">Refund Status</span>
                        <span className={`mo-refund-badge mo-refund-badge--${isRefundPending(refund.status) ? "pending" : (refund.status || "").toLowerCase()}`}>
                          {refund.status}
                        </span>
                      </div>

                      {refund.amount != null && (
                        <div className="mo-refund-amount-row">
                          <span>Refund Amount:</span>
                          <span className="mo-refund-amount">₹{formatCurrency(refund.amount)}</span>
                        </div>
                      )}

                      {refund.refundId && (
                        <div className="mo-refund-amount-row">
                          <span>Refund ID:</span>
                          <span className="mo-refund-txn">{refund.refundId}</span>
                        </div>
                      )}

                      {refund.processedAt && (
                        <div className="mo-refund-amount-row">
                          <span>Processed:</span>
                          <span>{formatDateTime(refund.processedAt)}</span>
                        </div>
                      )}

                      {/* Approve / Reject buttons when refund is PENDING */}
                      {refundPending && (
                        <div className="mo-refund-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="mo-refund-btn mo-refund-btn--approve"
                            disabled={!!refundProcessing}
                            onClick={() =>
                              setConfirmModal({ orderId: order.id, action: "approve", type: "refund" })
                            }
                          >
                            {refundProcessing === "approve" ? "Approving…" : "✓ Approve Refund"}
                          </button>
                          <button
                            type="button"
                            className="mo-refund-btn mo-refund-btn--reject"
                            disabled={!!refundProcessing}
                            onClick={() =>
                              setConfirmModal({ orderId: order.id, action: "reject", type: "refund" })
                            }
                          >
                            {refundProcessing === "reject" ? "Rejecting…" : "✕ Reject Refund"}
                          </button>
                        </div>
                      )}

                      {refund.status === "APPROVED" && (
                        <div className="mo-refund-note">
                          Refund approved. Processing via payment gateway…
                        </div>
                      )}

                      {refund.status === "PROCESSING" && (
                        <div className="mo-refund-note">
                          Refund is being processed via payment gateway…
                        </div>
                      )}

                      {refund.status === "PROCESSED" && (
                        <div className="mo-refund-note mo-refund-note--success">
                          Refund has been successfully processed.
                        </div>
                      )}

                      {refund.status === "REJECTED" && (
                        <div className="mo-refund-note mo-refund-note--danger">
                          Refund has been rejected.
                        </div>
                      )}

                      {refund.status === "FAILED" && (
                        <div className="mo-refund-note mo-refund-note--danger">
                          Refund processing failed. Please retry or contact support.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Paid order cancelled/rejected but no refund record yet — backend auto-creates refunds */}
                  {isCancelledOrRejected && !refund && isPaid && !isCodOrder && (
                    <div className="mo-refund-section mo-refund-section--none">
                      <span className="mo-refund-note">
                        Refund is being processed by the system. It may take a few moments to appear.
                      </span>
                    </div>
                  )}

                  {isCancelledOrRejected && !refund && !isPaid && !isCodOrder && (
                    <div className="mo-refund-section mo-refund-section--none">
                      <span className="mo-refund-note">
                        No payment was made for this order. Refund not applicable.
                      </span>
                    </div>
                  )}

                  {isCancelledOrRejected && isCodOrder && (
                    <div className="mo-refund-section mo-refund-section--none">
                      <span className="mo-refund-note">
                        💵 Cash on Delivery — no refund applicable.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mo-pagination">
            <button type="button" className="mo-page-btn" disabled={page === 0} onClick={() => setPage(0)}>«</button>
            <button type="button" className="mo-page-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i)
              .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
              .reduce((acc, i, idx, arr) => {
                if (idx > 0 && i - arr[idx - 1] > 1) acc.push(-1);
                acc.push(i);
                return acc;
              }, [])
              .map((i, idx) =>
                i === -1 ? (
                  <span key={`e-${idx}`} className="mo-page-ellipsis">…</span>
                ) : (
                  <button key={i} type="button" className={`mo-page-btn mo-page-num ${page === i ? "mo-page-num--active" : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
                )
              )}
            <button type="button" className="mo-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>›</button>
            <button type="button" className="mo-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
            <span className="mo-page-info">Page {page + 1} of {totalPages} · {totalElements} order{totalElements !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal — supports lifecycle + refund actions */}
      {confirmModal && (() => {
        const isLifecycle = confirmModal.type === "lifecycle";
        const cfg = isLifecycle ? ACTION_CONFIG[confirmModal.action] : null;

        const icon = isLifecycle
          ? cfg?.confirmIcon || "❓"
          : confirmModal.action === "approve" ? "✅" : "⚠️";

        const title = isLifecycle
          ? cfg?.confirmTitle || "Confirm action?"
          : confirmModal.action === "approve" ? "Approve Refund?" : "Reject Refund?";

        const desc = isLifecycle
          ? cfg?.confirmDesc || "Are you sure?"
          : confirmModal.action === "approve"
            ? "This will initiate the refund to the retailer's original payment method via the payment gateway. This action cannot be undone."
            : "This will reject the refund request. The retailer will be notified. Are you sure you want to proceed?";

        const confirmBtnClass = isLifecycle
          ? (confirmModal.action === "reject" || confirmModal.action === "cancel")
            ? "mo-modal-btn--reject"
            : "mo-modal-btn--approve"
          : confirmModal.action === "approve" ? "mo-modal-btn--approve" : "mo-modal-btn--reject";

        const confirmLabel = isLifecycle
          ? `Yes, ${cfg?.label || confirmModal.action}`
          : confirmModal.action === "approve" ? "Yes, Approve" : "Yes, Reject";

        return (
          <div className="mo-modal-overlay" onClick={() => setConfirmModal(null)}>
            <div className="mo-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="mo-modal-close"
                onClick={() => setConfirmModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <div className="mo-modal-icon">{icon}</div>
              <div className="mo-modal-title">{title}</div>
              <div className="mo-modal-desc">{desc}</div>
              <div className="mo-modal-actions">
                <button
                  type="button"
                  className="mo-modal-btn mo-modal-btn--secondary"
                  onClick={() => setConfirmModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`mo-modal-btn ${confirmBtnClass}`}
                  onClick={() =>
                    isLifecycle
                      ? handleLifecycleAction(confirmModal.orderId, confirmModal.action)
                      : handleRefundAction(confirmModal.orderId, confirmModal.action)
                  }
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
