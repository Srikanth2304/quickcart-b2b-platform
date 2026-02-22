import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { showToast } from "../utils/notify";
import Loader from "../components/Loader";
import "./ManufacturerOrderDetails.css";

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

/* Lifecycle helpers */
const TRACKING_STEPS = [
  { key: "PAYMENT_PENDING", label: "Order Created" },
  { key: "CONFIRMED", label: "Payment Confirmed" },
  { key: "ACCEPTED",  label: "Accepted" },
  { key: "SHIPPED",   label: "Shipped" },
  { key: "DELIVERED",  label: "Delivered" },
];

function getStepIndex(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s.includes("DELIVER") && !s.includes("OUT")) return 4;
  if (s.includes("SHIP")) return 3;
  if (s.includes("ACCEPT")) return 2;
  if (s.includes("CONFIRM")) return 1;
  return 0; // PAYMENT_PENDING or CREATED
}

function getLifecycleActions(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s === "PAYMENT_PENDING") return ["cancel"];
  if (s === "CONFIRMED") return ["accept", "reject", "cancel"];
  if (s === "ACCEPTED") return ["ship", "cancel"];
  if (s === "SHIPPED") return ["deliver"];
  return [];
}

const ACTION_CONFIG = {
  accept:  { label: "Accept Order",   icon: "✓", className: "mod-action-btn--accept",  confirmTitle: "Accept this order?",  confirmDesc: "This will move the order to ACCEPTED status. You'll need to prepare it for shipment.", confirmIcon: "✅" },
  reject:  { label: "Reject Order",   icon: "✕", className: "mod-action-btn--reject",  confirmTitle: "Reject this order?",  confirmDesc: "This will reject the order. If paid online, a refund will be automatically initiated. This action cannot be undone.", confirmIcon: "⚠️" },
  ship:    { label: "Mark Shipped",   icon: "🚚", className: "mod-action-btn--ship",   confirmTitle: "Mark as shipped?",   confirmDesc: "Confirm that this order has been shipped to the retailer.", confirmIcon: "🚚" },
  deliver: { label: "Mark Delivered", icon: "📦", className: "mod-action-btn--deliver", confirmTitle: "Mark as delivered?", confirmDesc: "Confirm that this order has been delivered to the retailer.", confirmIcon: "📦" },
  cancel:  { label: "Cancel Order",   icon: "⊘", className: "mod-action-btn--cancel",  confirmTitle: "Cancel this order?",  confirmDesc: "This will cancel the order and restore stock. If paid online, a refund will be processed. This cannot be undone.", confirmIcon: "🚫" },
};

const LIFECYCLE_ENDPOINTS = {
  accept:  (id) => `/orders/${id}/accept`,
  reject:  (id) => `/orders/${id}/reject`,
  ship:    (id) => `/orders/${id}/shipment`,
  deliver: (id) => `/orders/${id}/deliver`,
  cancel:  (id) => `/orders/${id}/cancel`,
};

const STATUS_STYLE = {
  PAYMENT_PENDING: { bg: "#fffbeb", color: "#f59e0b", label: "Payment Pending" },
  CREATED:    { bg: "#f3f4f6", color: "#6b7280", label: "Created" },
  CONFIRMED:  { bg: "#f0edff", color: "#6c5ce7", label: "Confirmed" },
  ACCEPTED:   { bg: "#eff6ff", color: "#2563eb", label: "Accepted" },
  SHIPPED:    { bg: "#e8f4ff", color: "#2196f3", label: "Shipped" },
  DELIVERED:  { bg: "#e8fdf0", color: "#27ae60", label: "Delivered" },
  CANCELLED:  { bg: "#fff0f0", color: "#e53935", label: "Cancelled" },
  REJECTED:   { bg: "#fff0f0", color: "#e53935", label: "Rejected" },
};

function getStatusStyle(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s.includes("REJECT")) return STATUS_STYLE.REJECTED;
  if (s.includes("CANCEL")) return STATUS_STYLE.CANCELLED;
  if (s.includes("DELIVER") && !s.includes("OUT")) return STATUS_STYLE.DELIVERED;
  if (s.includes("SHIP")) return STATUS_STYLE.SHIPPED;
  if (s.includes("ACCEPT")) return STATUS_STYLE.ACCEPTED;
  if (s.includes("CONFIRM")) return STATUS_STYLE.CONFIRMED;
  if (s === "PAYMENT_PENDING") return STATUS_STYLE.PAYMENT_PENDING;
  return STATUS_STYLE.CREATED;
}

function isRefundPending(status) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "PENDING_APPROVAL";
}

export default function ManufacturerOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [productImages, setProductImages] = useState({});

  // Refund
  const [refund, setRefund] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundActionInProgress, setRefundActionInProgress] = useState(null);

  // Lifecycle
  const [lifecycleInProgress, setLifecycleInProgress] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    if (!orderId) {
      navigate("/manufacturer/orders");
      return;
    }
    let isMounted = true;

    const fetchOrder = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/orders/${orderId}`);
        if (!isMounted) return;
        const orderData = res?.data || null;
        setOrder(orderData);

        // Fetch product images
        const items = orderData?.items || orderData?.orderItems || [];
        const imgMap = {};
        await Promise.allSettled(
          items.map(async (item) => {
            if (!item.productId) return;
            try {
              const pRes = await api.get(`/products/${item.productId}`);
              const p = pRes?.data;
              imgMap[item.productId] = {
                imageUrl: p?.imageUrl || p?.image || p?.thumbnail || "",
                brand: p?.brand || "",
                name: p?.name || "",
                mrp: p?.mrp || p?.originalPrice || 0,
              };
            } catch {
              // skip
            }
          })
        );
        if (isMounted) setProductImages(imgMap);

        // Fetch refund if cancelled/rejected (always attempt — backend knows if payment exists)
        const status = (orderData?.status || "").toUpperCase();
        if (status.includes("CANCEL") || status.includes("REJECT")) {
          try {
            setRefundLoading(true);
            const rRes = await api.get(`/orders/${orderId}/refund`);
            if (isMounted) setRefund(rRes?.data || null);
          } catch (err) {
            // 404 = no refund record exists, safely set null
            if (isMounted) setRefund(null);
          } finally {
            if (isMounted) setRefundLoading(false);
          }
        }
      } catch {
        if (isMounted) setError("Failed to load order details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();
    return () => { isMounted = false; };
  }, [orderId, navigate]);

  /* Lifecycle action handler */
  const handleLifecycleAction = async (action) => {
    setConfirmModal(null);
    setLifecycleInProgress(action);
    try {
      const endpoint = LIFECYCLE_ENDPOINTS[action];
      if (!endpoint) return;
      await api.post(endpoint(orderId));
      // Re-fetch order
      const res = await api.get(`/orders/${orderId}`);
      if (res?.data) setOrder(res.data);
      // Fetch refund for cancel/reject (refund may be auto-created)
      if (action === "reject" || action === "cancel") {
        try {
          const rRes = await api.get(`/orders/${orderId}/refund`);
          setRefund(rRes?.data || null);
        } catch {
          // no refund record created yet
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || `Failed to ${action} order.`;
      showToast(msg, "error");
    } finally {
      setLifecycleInProgress(null);
    }
  };

  /* Refund action handler */
  const handleRefundAction = async (action) => {
    setConfirmModal(null);
    setRefundActionInProgress(action);
    try {
      await api.post(`/orders/${orderId}/refund/${action}`);
      try {
        const rRes = await api.get(`/orders/${orderId}/refund`);
        setRefund(rRes?.data || null);
      } catch (err) {
        if (err?.response?.status === 404) {
          setRefund(null);
        } else {
          // Non-404 error — update optimistically
          setRefund((prev) =>
            prev ? { ...prev, status: action === "approve" ? "APPROVED" : "REJECTED" } : null
          );
        }
      }
    } catch (err) {
      showToast(err?.response?.data?.message || `Failed to ${action} refund.`, "error");
    } finally {
      setRefundActionInProgress(null);
    }
  };

  if (!orderId) return null;

  const status = order?.status || "";
  const statusUpper = status.toUpperCase().replace(/[\s-]/g, "_");
  const activeStep = getStepIndex(status);
  const isDelivered = statusUpper.includes("DELIVER") && !statusUpper.includes("OUT");
  const isCancelled = statusUpper.includes("CANCEL");
  const isRejected = statusUpper.includes("REJECT");
  const isCancelledOrRejected = isCancelled || isRejected;
  const statusStyle = getStatusStyle(status);

  const items = order?.items || order?.orderItems || [];
  const totalAmount = order?.totalAmount || order?.amount || 0;
  const orderDate = order?.orderDate || order?.createdAt || order?.placedAt || "";
  const confirmedDate = order?.confirmedAt || order?.paidAt || "";
  const acceptedDate = order?.acceptedAt || "";
  const shippedDate = order?.shippedDate || order?.shippingDate || order?.shippedAt || "";
  const deliveredDate = order?.deliveredAt || order?.deliveryDate || "";
  const cancelledDate = order?.cancelledAt || order?.cancelledDate || order?.updatedAt || "";

  const paymentMethod = order?.paymentMethod || order?.payment?.gateway || "Online";
  const paymentId = order?.payment?.paymentId || order?.paymentId || "";
  const paymentStatus = order?.paymentStatus || order?.payment?.status || "";
  const isCodOrder = (order?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY";

  // Shipment info
  const trackingNumber = order?.trackingNumber || order?.shipment?.trackingNumber || "";
  const carrierName = order?.carrierName || order?.shipment?.carrier || order?.shipment?.carrierName || "";

  // Address
  const addr = order?.deliveryAddress || order?.address || {};
  const addrName = order?.deliveryName || addr?.name || addr?.fullName || "Customer";
  const addrLine = [
    order?.deliveryAddressLine1 || addr?.addressLine1 || addr?.line1 || addr?.street,
    order?.deliveryCity || addr?.city,
    order?.deliveryState || addr?.state,
  ].filter(Boolean).join(", ");
  const addrPin = order?.deliveryPincode || addr?.pincode || addr?.zipCode || "";
  const addrPhone = order?.deliveryPhone || addr?.phone || addr?.mobile || "";

  const actions = getLifecycleActions(status);

  return (
    <div className="mod-page">
      {/* Back nav */}
      <div className="mod-back-row">
        <button type="button" className="mod-back-btn" onClick={() => navigate("/manufacturer/orders")}>
          ← Back to Orders
        </button>
      </div>

      <div className="mod-layout">
        {/* ===== Main ===== */}
        <section className="mod-main">
          {loading && <div className="mod-card mod-state"><Loader text="Loading order details…" /></div>}
          {!loading && error && <div className="mod-card mod-error">{error}</div>}

          {!loading && !error && order && (
            <>
              {/* Order header */}
              <div className="mod-card mod-order-header">
                <div className="mod-order-header-top">
                  <div>
                    <div className="mod-order-id">Order #{order.id || orderId}</div>
                    <div className="mod-order-date">
                      Placed {formatDateTime(orderDate)}
                    </div>
                  </div>
                  <span
                    className="mod-status-badge"
                    style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.color}22` }}
                  >
                    {statusStyle.label}
                  </span>
                </div>

                {/* Retailer info */}
                {order.retailerName && (
                  <div className="mod-retailer-row">
                    <span className="mod-retailer-icon">🏪</span>
                    <span className="mod-retailer-name">{order.retailerName}</span>
                    {order.retailerEmail && <span className="mod-retailer-email">{order.retailerEmail}</span>}
                  </div>
                )}
              </div>

              {/* ===== Tracking Timeline ===== */}
              <div className="mod-card">
                <div className="mod-section-title">Order Timeline</div>
                <div className="mod-timeline">
                  {isCancelledOrRejected ? (
                    <>
                      {/* Steps up to the point of cancellation */}
                      <div className="mod-step mod-step--done">
                        <div className="mod-step-dot-col">
                          <span className="mod-step-dot mod-step-dot--done" />
                          <span className="mod-step-line mod-step-line--cancelled" />
                        </div>
                        <div className="mod-step-text">
                          <span className="mod-step-label">Order Created</span>
                          {orderDate && <span className="mod-step-sub">{formatDateTime(orderDate)}</span>}
                        </div>
                      </div>
                      {confirmedDate && (
                        <div className="mod-step mod-step--done">
                          <div className="mod-step-dot-col">
                            <span className="mod-step-dot mod-step-dot--done" />
                            <span className="mod-step-line mod-step-line--cancelled" />
                          </div>
                          <div className="mod-step-text">
                            <span className="mod-step-label">Payment Confirmed</span>
                            <span className="mod-step-sub">{formatDateTime(confirmedDate)}</span>
                          </div>
                        </div>
                      )}
                      <div className="mod-step mod-step--done mod-step--cancelled">
                        <div className="mod-step-dot-col">
                          <span className="mod-step-dot mod-step-dot--cancelled" />
                        </div>
                        <div className="mod-step-text">
                          <span className="mod-step-label">
                            {isRejected ? "Rejected" : "Cancelled"}
                          </span>
                          {cancelledDate && <span className="mod-step-sub">{formatDateTime(cancelledDate)}</span>}
                        </div>
                      </div>
                    </>
                  ) : (
                    TRACKING_STEPS.map((step, i) => {
                      const done = i <= activeStep;
                      const current = i === activeStep;
                      let sub = "";
                      if (i === 0 && orderDate) sub = formatDateTime(orderDate);
                      if (i === 1 && confirmedDate) sub = formatDateTime(confirmedDate);
                      if (i === 2 && acceptedDate) sub = formatDateTime(acceptedDate);
                      if (i === 3 && shippedDate) sub = formatDateTime(shippedDate);
                      if (i === 4 && deliveredDate) sub = formatDateTime(deliveredDate);

                      return (
                        <div className={`mod-step ${done ? "mod-step--done" : ""} ${current ? "mod-step--current" : ""}`} key={step.key}>
                          <div className="mod-step-dot-col">
                            <span className={`mod-step-dot ${done ? "mod-step-dot--done" : ""}`} />
                            {i < TRACKING_STEPS.length - 1 && (
                              <span className={`mod-step-line ${done && i < activeStep ? "mod-step-line--done" : ""}`} />
                            )}
                          </div>
                          <div className="mod-step-text">
                            <span className="mod-step-label">
                              {step.label}
                              {current && <span className="mod-step-badge"> — Current</span>}
                            </span>
                            {sub && <span className="mod-step-sub">{sub}</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ===== Lifecycle Action Buttons ===== */}
              {actions.length > 0 && (
                <div className="mod-card mod-actions-card">
                  <div className="mod-section-title">Actions</div>
                  <div className="mod-actions-row">
                    {actions.map((action) => {
                      const cfg = ACTION_CONFIG[action];
                      if (!cfg) return null;
                      const isProcessing = lifecycleInProgress === action;
                      return (
                        <button
                          key={action}
                          type="button"
                          className={`mod-action-btn ${cfg.className}`}
                          disabled={!!lifecycleInProgress}
                          onClick={() => setConfirmModal({ action, type: "lifecycle" })}
                        >
                          {isProcessing ? "Processing…" : `${cfg.icon} ${cfg.label}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== Product Items ===== */}
              <div className="mod-card">
                <div className="mod-section-title">
                  Order Items ({items.length})
                </div>
                <div className="mod-items">
                  {items.map((item, idx) => {
                    const pData = productImages[item.productId] || {};
                    const name = item.productName || pData.name || item.name || "Product";
                    const img = pData.imageUrl || item.imageUrl || "";
                    const brand = pData.brand || "";
                    const price = item.price || item.unitPrice || 0;
                    const qty = item.quantity || 1;
                    const mrp = pData.mrp || item.mrp || 0;

                    return (
                      <div className="mod-item" key={item.id || idx}>
                        {img ? (
                          <img className="mod-item-img" src={img} alt={name} />
                        ) : (
                          <div className="mod-item-img-placeholder">{name.charAt(0)}</div>
                        )}
                        <div className="mod-item-info">
                          <div className="mod-item-name">{name}</div>
                          {brand && <div className="mod-item-brand">{brand}</div>}
                          <div className="mod-item-meta">
                            <span className="mod-item-price">₹{formatCurrency(price)}</span>
                            {qty > 1 && <span className="mod-item-qty">× {qty}</span>}
                            {mrp > price && (
                              <span className="mod-item-mrp">₹{formatCurrency(mrp)}</span>
                            )}
                          </div>
                        </div>
                        <div className="mod-item-subtotal">₹{formatCurrency(price * qty)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ===== Shipment Details ===== */}
              {(trackingNumber || carrierName) && (
                <div className="mod-card">
                  <div className="mod-section-title">Shipment Details</div>
                  <div className="mod-detail-grid">
                    {carrierName && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Carrier</span>
                        <span className="mod-detail-value">{carrierName}</span>
                      </div>
                    )}
                    {trackingNumber && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Tracking Number</span>
                        <span className="mod-detail-value mod-mono">{trackingNumber}</span>
                      </div>
                    )}
                    {shippedDate && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Shipped At</span>
                        <span className="mod-detail-value">{formatDateTime(shippedDate)}</span>
                      </div>
                    )}
                    {deliveredDate && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Delivered At</span>
                        <span className="mod-detail-value">{formatDateTime(deliveredDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== Refund Section (online payments only) ===== */}
              {isCancelledOrRejected && !isCodOrder && !refundLoading && refund && (
                <div className={`mod-card mod-refund-card mod-refund-card--${isRefundPending(refund.status) ? "pending" : (refund.status || "").toLowerCase()}`}>
                  <div className="mod-section-title">Refund</div>
                  <div className="mod-refund-status-row">
                    <span className="mod-refund-badge" data-status={isRefundPending(refund.status) ? "pending" : (refund.status || "").toLowerCase()}>
                      {refund.status}
                    </span>
                  </div>
                  <div className="mod-detail-grid">
                    {refund.amount != null && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Amount</span>
                        <span className="mod-detail-value mod-refund-amount">₹{formatCurrency(refund.amount)}</span>
                      </div>
                    )}
                    {refund.refundId && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Refund ID</span>
                        <span className="mod-detail-value mod-mono">{refund.refundId}</span>
                      </div>
                    )}
                    {refund.processedAt && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Processed</span>
                        <span className="mod-detail-value">{formatDateTime(refund.processedAt)}</span>
                      </div>
                    )}
                    {refund.createdAt && (
                      <div className="mod-detail-row">
                        <span className="mod-detail-label">Requested</span>
                        <span className="mod-detail-value">{formatDateTime(refund.createdAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Approve / Reject refund */}
                  {isRefundPending(refund.status) && (
                    <div className="mod-refund-actions">
                      <button
                        type="button"
                        className="mod-action-btn mod-action-btn--accept"
                        disabled={!!refundActionInProgress}
                        onClick={() => setConfirmModal({ action: "approve", type: "refund" })}
                      >
                        {refundActionInProgress === "approve" ? "Approving…" : "✓ Approve Refund"}
                      </button>
                      <button
                        type="button"
                        className="mod-action-btn mod-action-btn--reject"
                        disabled={!!refundActionInProgress}
                        onClick={() => setConfirmModal({ action: "reject", type: "refund" })}
                      >
                        {refundActionInProgress === "reject" ? "Rejecting…" : "✕ Reject Refund"}
                      </button>
                    </div>
                  )}

                  {refund.status === "APPROVED" && (
                    <div className="mod-refund-note">Refund approved. Processing via payment gateway…</div>
                  )}
                  {refund.status === "PROCESSING" && (
                    <div className="mod-refund-note">Refund is being processed…</div>
                  )}
                  {refund.status === "PROCESSED" && (
                    <div className="mod-refund-note mod-refund-note--success">Refund has been successfully processed.</div>
                  )}
                  {refund.status === "REJECTED" && (
                    <div className="mod-refund-note mod-refund-note--danger">Refund has been rejected.</div>
                  )}
                  {refund.status === "FAILED" && (
                    <div className="mod-refund-note mod-refund-note--danger">Refund processing failed.</div>
                  )}
                </div>
              )}

              {isCancelledOrRejected && !isCodOrder && refundLoading && (
                <div className="mod-card mod-state"><Loader size="sm" text="Checking refund status…" /></div>
              )}

              {/* Paid order cancelled/rejected but no refund record yet — backend auto-creates refunds */}
              {isCancelledOrRejected && !isCodOrder && !refundLoading && !refund && (paymentId || paymentStatus) && (
                <div className="mod-card mod-refund-card mod-refund-card--pending">
                  <div className="mod-section-title">Refund</div>
                  <div className="mod-refund-note">
                    Refund is being processed by the system. It may take a few moments to appear. Try refreshing the page.
                  </div>
                </div>
              )}

              {isCancelledOrRejected && !isCodOrder && !refundLoading && !refund && !paymentId && !paymentStatus && (
                <div className="mod-card mod-refund-card">
                  <div className="mod-section-title">Refund</div>
                  <div className="mod-refund-note">
                    No payment was found for this order. Refund not applicable.
                  </div>
                </div>
              )}

              {isCancelledOrRejected && isCodOrder && (
                <div className="mod-card mod-refund-card">
                  <div className="mod-section-title">Payment</div>
                  <div className="mod-refund-note">
                    💵 Cash on Delivery — no refund applicable.
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ===== Sidebar ===== */}
        <aside className="mod-side">
          {!loading && !error && order && (
            <>
              {/* Delivery Address */}
              <div className="mod-side-card">
                <div className="mod-side-heading">Delivery Address</div>
                <div className="mod-addr-name">{addrName}</div>
                {addrLine && <div className="mod-addr-line">{addrLine}</div>}
                {addrPin && <div className="mod-addr-pin">PIN: {addrPin}</div>}
                {addrPhone && <div className="mod-addr-phone">📞 {addrPhone}</div>}
              </div>

              {/* Payment Info */}
              <div className="mod-side-card">
                <div className="mod-side-heading">Payment</div>
                <div className="mod-detail-grid">
                  <div className="mod-detail-row">
                    <span className="mod-detail-label">Method</span>
                    <span className="mod-detail-value">{isCodOrder ? "💵" : "💳"} {isCodOrder ? "Cash on Delivery" : paymentMethod}</span>
                  </div>
                  {paymentStatus && (
                    <div className="mod-detail-row">
                      <span className="mod-detail-label">Status</span>
                      <span className="mod-detail-value">
                        {isCodOrder
                          ? (paymentStatus === "COLLECTED" ? "🟢 Collected" : "🟡 Pending Collection")
                          : paymentStatus}
                      </span>
                    </div>
                  )}
                  {!isCodOrder && !isCodOrder && paymentId && (
                    <div className="mod-detail-row">
                      <span className="mod-detail-label">Payment ID</span>
                      <span className="mod-detail-value mod-mono">{paymentId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Summary */}
              <div className="mod-side-card">
                <div className="mod-side-heading">Price Summary</div>
                {items.map((item, idx) => {
                  const price = item.price || item.unitPrice || 0;
                  const qty = item.quantity || 1;
                  return (
                    <div className="mod-price-row" key={item.id || idx}>
                      <span className="mod-price-item-name">
                        {item.productName || "Item"} × {qty}
                      </span>
                      <span>₹{formatCurrency(price * qty)}</span>
                    </div>
                  );
                })}
                {(order?.shippingFee || order?.deliveryFee) ? (
                  <div className="mod-price-row">
                    <span>Shipping</span>
                    <span>₹{formatCurrency(order?.shippingFee || order?.deliveryFee)}</span>
                  </div>
                ) : null}
                <div className="mod-price-divider" />
                <div className="mod-price-row mod-price-total">
                  <span>Total</span>
                  <span>₹{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ===== Confirmation Modal ===== */}
      {confirmModal && (() => {
        const isLifecycle = confirmModal.type === "lifecycle";
        const cfg = isLifecycle ? ACTION_CONFIG[confirmModal.action] : null;

        const icon = isLifecycle
          ? cfg?.confirmIcon || "❓"
          : confirmModal.action === "approve" ? "✅" : "⚠️";
        const title = isLifecycle
          ? cfg?.confirmTitle || "Confirm?"
          : confirmModal.action === "approve" ? "Approve Refund?" : "Reject Refund?";
        const desc = isLifecycle
          ? cfg?.confirmDesc || "Are you sure?"
          : confirmModal.action === "approve"
            ? "This will initiate the refund to the retailer's original payment method. This cannot be undone."
            : "This will reject the refund request.";
        const confirmBtnClass = isLifecycle
          ? (confirmModal.action === "reject" || confirmModal.action === "cancel") ? "mod-modal-btn--reject" : "mod-modal-btn--approve"
          : confirmModal.action === "approve" ? "mod-modal-btn--approve" : "mod-modal-btn--reject";
        const confirmLabel = isLifecycle
          ? `Yes, ${cfg?.label || confirmModal.action}`
          : confirmModal.action === "approve" ? "Yes, Approve" : "Yes, Reject";

        return (
          <div className="mod-modal-overlay" onClick={() => setConfirmModal(null)}>
            <div className="mod-modal" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="mod-modal-close" onClick={() => setConfirmModal(null)} aria-label="Close">✕</button>
              <div className="mod-modal-icon">{icon}</div>
              <div className="mod-modal-title">{title}</div>
              <div className="mod-modal-desc">{desc}</div>
              <div className="mod-modal-actions">
                <button type="button" className="mod-modal-btn mod-modal-btn--secondary" onClick={() => setConfirmModal(null)}>
                  Go Back
                </button>
                <button
                  type="button"
                  className={`mod-modal-btn ${confirmBtnClass}`}
                  onClick={() =>
                    isLifecycle
                      ? handleLifecycleAction(confirmModal.action)
                      : handleRefundAction(confirmModal.action)
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
