import { useEffect, useState } from "react";
import api from "../api/axios";
import "./ManufacturerOrders.css";

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
  CONFIRMED: { bg: "#f0edff", color: "#6c5ce7", label: "Confirmed" },
  SHIPPED: { bg: "#e8f4ff", color: "#2196f3", label: "Shipped" },
  OUT_FOR_DELIVERY: { bg: "#fff8e1", color: "#f39c12", label: "Out for Delivery" },
  DELIVERED: { bg: "#e8fdf0", color: "#27ae60", label: "Delivered" },
  CANCELLED: { bg: "#fff0f0", color: "#e53935", label: "Cancelled" },
};

const FILTER_OPTIONS = ["All", "Confirmed", "Shipped", "Delivered", "Cancelled"];

function isRefundPending(status) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "PENDING_APPROVAL";
}

export default function ManufacturerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Refund data per order
  const [refunds, setRefunds] = useState({});
  const [refundActions, setRefundActions] = useState({});

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(null); // { orderId, action: 'approve'|'reject' }

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/orders", { params: { page: 0, size: 100 } });
        if (!isMounted) return;
        const resData = res?.data || {};
        const data = Array.isArray(resData) ? resData : resData.content || resData.orders || [];
        setOrders(data);

        // Fetch refund data for cancelled orders
        const cancelledOrders = data.filter((o) => {
          const s = (o.status || "").toUpperCase();
          return s.includes("CANCEL") || s.includes("REJECTED");
        });

        const refundMap = {};
        await Promise.allSettled(
          cancelledOrders.map(async (o) => {
            try {
              const rRes = await api.get(`/orders/${o.id}/refund`);
              refundMap[o.id] = rRes?.data || null;
            } catch {
              // no refund
            }
          })
        );
        if (isMounted) setRefunds(refundMap);
      } catch {
        if (isMounted) setError("Failed to load orders.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefundAction = async (orderId, action) => {
    setConfirmModal(null);
    setRefundActions((prev) => ({ ...prev, [orderId]: action }));
    try {
      await api.post(`/orders/${orderId}/refund/${action}`);
      // Refetch refund data for this order
      try {
        const rRes = await api.get(`/orders/${orderId}/refund`);
        setRefunds((prev) => ({ ...prev, [orderId]: rRes?.data || null }));
      } catch {
        // If refetch fails, update optimistically
        setRefunds((prev) => ({
          ...prev,
          [orderId]: prev[orderId]
            ? { ...prev[orderId], status: action === "approve" ? "APPROVED" : "REJECTED" }
            : null,
        }));
      }
    } catch {
      alert(`Failed to ${action} refund. Please try again.`);
    } finally {
      setRefundActions((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  // Filtering & search
  const filteredOrders = orders.filter((o) => {
    const s = (o.status || "").toUpperCase();
    if (filter !== "All") {
      const filterUpper = filter.toUpperCase();
      if (filterUpper === "CANCELLED") {
        if (!s.includes("CANCEL") && !s.includes("REJECTED")) return false;
      } else if (!s.includes(filterUpper)) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = String(o.id || "").includes(term);
      const matchRetailer = (o.retailerName || "").toLowerCase().includes(term);
      const matchItems = (o.items || []).some((i) =>
        (i.productName || "").toLowerCase().includes(term)
      );
      if (!matchId && !matchRetailer && !matchItems) return false;
    }
    return true;
  });

  const getStatusStyle = (status) => {
    const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
    if (s.includes("CANCEL") || s.includes("REJECTED")) return STATUS_COLORS.CANCELLED;
    if (s.includes("DELIVER") && !s.includes("OUT")) return STATUS_COLORS.DELIVERED;
    if (s.includes("OUT")) return STATUS_COLORS.OUT_FOR_DELIVERY;
    if (s.includes("SHIP")) return STATUS_COLORS.SHIPPED;
    return STATUS_COLORS.CONFIRMED;
  };

  return (
    <div className="mo-page">
      <div className="mo-container">
        {/* Header */}
        <div className="mo-header">
          <div>
            <h1 className="mo-title">Retailer Orders</h1>
            <p className="mo-subtitle">
              Manage incoming orders and process refunds
            </p>
          </div>
          <div className="mo-stats">
            <div className="mo-stat">
              <span className="mo-stat-num">{orders.length}</span>
              <span className="mo-stat-label">Total</span>
            </div>
            <div className="mo-stat">
              <span className="mo-stat-num mo-stat-num--active">
                {orders.filter((o) => {
                  const s = (o.status || "").toUpperCase();
                  return !s.includes("CANCEL") && !s.includes("DELIVER");
                }).length}
              </span>
              <span className="mo-stat-label">Active</span>
            </div>
            <div className="mo-stat">
              <span className="mo-stat-num mo-stat-num--cancelled">
                {orders.filter((o) => (o.status || "").toUpperCase().includes("CANCEL")).length}
              </span>
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
                onClick={() => setFilter(f)}
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
          </div>
        </div>

        {/* Content */}
        {loading && <div className="mo-state">Loading orders…</div>}
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
              const isCancelled =
                (order.status || "").toUpperCase().includes("CANCEL") ||
                (order.status || "").toUpperCase().includes("REJECTED");
              const refund = refunds[order.id] || null;
              const refundPending = refund && isRefundPending(refund.status);
              const refundProcessing = refundActions[order.id];
              const paymentStatus = (order?.payment?.status || "").toUpperCase();
              const paymentGateway = (order?.payment?.gateway || order?.paymentMethod || "").toUpperCase();
              const isPaid = paymentStatus === "SUCCESS" || paymentStatus === "COMPLETED" || paymentStatus === "REFUND_PENDING" || paymentStatus === "REFUNDED" || paymentGateway === "RAZORPAY" || paymentGateway === "ONLINE" || !!order?.payment?.paymentId || !!order?.paymentId;

              return (
                <div className="mo-order-card" key={order.id}>
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
                      <span className="mo-payment-gateway">
                        💳 {order?.payment?.gateway || "Online"}
                      </span>
                      {isPaid && (
                        <span className="mo-payment-paid">Paid</span>
                      )}
                    </div>
                  </div>

                  {/* Refund Section */}
                  {isCancelled && refund && (
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
                        <div className="mo-refund-actions">
                          <button
                            type="button"
                            className="mo-refund-btn mo-refund-btn--approve"
                            disabled={!!refundProcessing}
                            onClick={() =>
                              setConfirmModal({ orderId: order.id, action: "approve" })
                            }
                          >
                            {refundProcessing === "approve" ? "Approving…" : "✓ Approve Refund"}
                          </button>
                          <button
                            type="button"
                            className="mo-refund-btn mo-refund-btn--reject"
                            disabled={!!refundProcessing}
                            onClick={() =>
                              setConfirmModal({ orderId: order.id, action: "reject" })
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

                  {/* Show message for cancelled orders without a refund record */}
                  {isCancelled && !refund && (
                    <div className="mo-refund-section mo-refund-section--none">
                      <span className="mo-refund-note">
                        No refund request found for this cancelled order.
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
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
            <div className="mo-modal-icon">
              {confirmModal.action === "approve" ? "✅" : "⚠️"}
            </div>
            <div className="mo-modal-title">
              {confirmModal.action === "approve"
                ? "Approve Refund?"
                : "Reject Refund?"}
            </div>
            <div className="mo-modal-desc">
              {confirmModal.action === "approve"
                ? "This will initiate the refund to the retailer's original payment method via the payment gateway. This action cannot be undone."
                : "This will reject the refund request. The retailer will be notified. Are you sure you want to proceed?"}
            </div>
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
                className={`mo-modal-btn ${confirmModal.action === "approve" ? "mo-modal-btn--approve" : "mo-modal-btn--reject"}`}
                onClick={() =>
                  handleRefundAction(confirmModal.orderId, confirmModal.action)
                }
              >
                {confirmModal.action === "approve"
                  ? "Yes, Approve"
                  : "Yes, Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
