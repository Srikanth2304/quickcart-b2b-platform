import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./OrderDetails.css";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "-";
  return Number(value).toLocaleString("en-IN");
}

const TRACKING_STEPS = [
  { key: "CONFIRMED", label: "Order Confirmed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function isRefundPending(status) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "PENDING_APPROVAL";
}

function getStepIndex(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s.includes("DELIVER") && !s.includes("OUT")) return 3;
  if (s.includes("OUT")) return 2;
  if (s.includes("SHIP")) return 1;
  if (s.includes("CONFIRM") || s.includes("PLACED")) return 0;
  return 0;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: undefined,
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
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
    const timePart = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${datePart} - ${timePart}`;
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [productImages, setProductImages] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [refund, setRefund] = useState(null);
  const [refundLoading, setRefundLoading] = useState(false);

  /* Review state */
  const [reviews, setReviews] = useState({});        // { productId: { rating, comment, submitted } }
  const [reviewDrafts, setReviewDrafts] = useState({}); // { productId: { rating, comment } }
  const [reviewSubmitting, setReviewSubmitting] = useState({});
  const [expandedReview, setExpandedReview] = useState(null); // productId of open review form

  useEffect(() => {
    if (!orderId) {
      navigate("/");
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

        // Fetch product details for each item
        const orderItems = orderData?.items || orderData?.orderItems || [];
        const imgMap = {};
        await Promise.allSettled(
          orderItems.map(async (item) => {
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
              // product fetch failed, skip
            }
          })
        );
        if (isMounted) setProductImages(imgMap);

        // Fetch existing reviews for each product
        const revMap = {};
        await Promise.allSettled(
          orderItems.map(async (item) => {
            if (!item.productId) return;
            try {
              const rRes = await api.get(`/products/${item.productId}/reviews/my`);
              if (rRes?.data) {
                revMap[item.productId] = {
                  rating: rRes.data.rating || 0,
                  comment: rRes.data.comment || rRes.data.review || "",
                  submitted: true,
                };
              }
            } catch { /* no review exists yet */ }
          })
        );
        if (isMounted) setReviews(revMap);

        // Fetch refund info if order is cancelled
        const orderStatus = (orderData?.status || "").toUpperCase();
        if (orderStatus.includes("CANCEL") || orderStatus.includes("REJECTED")) {
          try {
            setRefundLoading(true);
            const refundRes = await api.get(`/orders/${orderId}/refund`);
            if (isMounted) setRefund(refundRes?.data || null);
          } catch {
            // No refund exists or endpoint not available
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
    return () => {
      isMounted = false;
    };
  }, [orderId, navigate]);

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      setOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
      setShowCancelModal(false);
    } catch {
      alert("Failed to cancel order. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  /* Submit a review */
  const handleSubmitReview = async (productId) => {
    const draft = reviewDrafts[productId];
    if (!draft?.rating) return;
    setReviewSubmitting((p) => ({ ...p, [productId]: true }));
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating: draft.rating,
        comment: draft.comment || "",
      });
      setReviews((p) => ({ ...p, [productId]: { ...draft, submitted: true } }));
      setExpandedReview(null);
    } catch {
      alert("Failed to submit review. Please try again.");
    } finally {
      setReviewSubmitting((p) => ({ ...p, [productId]: false }));
    }
  };

  const updateDraft = (productId, field, value) => {
    setReviewDrafts((p) => ({
      ...p,
      [productId]: { ...(p[productId] || { rating: 0, comment: "" }), [field]: value },
    }));
  };

  if (!orderId) return null;

  const status = order?.status || "";
  const activeStep = getStepIndex(status);
  const isDelivered = activeStep >= 3;
  const isCancelled =
    status.toUpperCase().includes("CANCEL") ||
    status.toUpperCase().includes("REJECTED");

  const orderDate = order?.orderDate || order?.createdAt || order?.placedAt || "";
  const deliveryDate =
    order?.deliveryDate || order?.expectedDeliveryDate || order?.deliveryEta || "";
  const shippedDate = order?.shippedDate || order?.shippingDate || order?.shippedAt || "";
  const cancelledDate = order?.cancelledAt || order?.cancelledDate || order?.updatedAt || "";

  const items = order?.items || order?.orderItems || [];
  const totalAmount = order?.totalAmount || order?.amount || 0;
  const paymentMethod =
    order?.paymentMethod || order?.payment?.gateway || order?.payment?.method || "Online";
  const paymentId =
    order?.payment?.paymentId ||
    order?.paymentId ||
    order?.razorpayPaymentId ||
    "";

  // Address
  const addr = order?.deliveryAddress || order?.address || {};
  const addrName =
    order?.deliveryName || addr?.name || addr?.fullName || "Customer";
  const addrLine = [
    order?.deliveryAddressLine1 || addr?.addressLine1 || addr?.line1 || addr?.street,
    order?.deliveryCity || addr?.city,
    order?.deliveryState || addr?.state,
  ]
    .filter(Boolean)
    .join(", ");
  const addrPin =
    order?.deliveryPincode || addr?.pincode || addr?.zipCode || "";
  const addrPhone =
    order?.deliveryPhone || addr?.phone || addr?.mobile || "";

  // Savings for cancel modal
  const totalMrp = items.reduce(
    (s, i) => {
      const pMrp = productImages[i.productId]?.mrp || 0;
      return s + (pMrp || i.mrp || i.price || i.unitPrice || 0) * (i.quantity || 1);
    },
    0
  );
  const totalPaid = items.reduce(
    (s, i) => s + (i.price || i.unitPrice || 0) * (i.quantity || 1),
    0
  );
  const savings = totalMrp - totalPaid;
  const firstItemImg =
    productImages[items[0]?.productId]?.imageUrl ||
    items[0]?.imageUrl ||
    "";

  return (
    <div className="od-page">
      <div className="od-layout">
        {/* ===== Main Section ===== */}
        <section className="od-main">
          {loading && (
            <div className="od-card od-state">Loading order details…</div>
          )}
          {!loading && error && (
            <div className="od-card od-error">{error}</div>
          )}

          {!loading && !error && order && (
            <>
              {/* Online‑pay banner */}
              {!isDelivered && !isCancelled && (
                <div className="od-banner">
                  <span>Pay online for a smooth doorstep experience</span>
                  <button
                    type="button"
                    className="od-banner-btn"
                    onClick={() => navigate("/retailer/orders")}
                  >
                    Pay ₹{formatCurrency(totalAmount)}
                  </button>
                </div>
              )}

              {/* Product cards */}
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const pData = productImages[item.productId] || {};
                  const name =
                    item.productName ||
                    pData.name ||
                    item.name ||
                    "Product";
                  const img = pData.imageUrl || item.imageUrl || "";
                  const brand = pData.brand || "";
                  const supplier = order?.manufacturerName || "";
                  const price = item.price || item.unitPrice || 0;
                  const qty = item.quantity || 1;
                  const mrp = pData.mrp || item.mrp || 0;

                  return (
                    <div className="od-card" key={item.id || idx}>
                      <div className="od-product-row">
                        <div className="od-product-info">
                          <div className="od-product-name">{name}</div>
                          {brand && (
                            <div className="od-product-brand">{brand}</div>
                          )}
                          {supplier && (
                            <div className="od-product-seller">
                              Supplier: {supplier}
                            </div>
                          )}
                          <div className="od-product-price">
                            ₹{formatCurrency(price)}{" "}
                            {qty > 1 && (
                              <span className="od-product-qty">× {qty}</span>
                            )}
                          </div>
                        </div>
                        {img ? (
                          <img
                            className="od-product-img"
                            src={img}
                            alt={name}
                          />
                        ) : (
                          <div className="od-product-img-placeholder">
                            {name?.charAt(0) || "P"}
                          </div>
                        )}
                      </div>

                      {/* ===== Tracking Timeline ===== */}
                      <div className="od-timeline">
                        {isCancelled ? (
                          <>
                            {/* Confirmed step */}
                            <div className="od-step od-step--done">
                              <div className="od-step-dot-col">
                                <span className="od-step-dot od-step-dot--done" />
                                <span className="od-step-line od-step-line--cancelled" />
                              </div>
                              <div className="od-step-text">
                                <span className="od-step-label">
                                  Order Confirmed, Today{orderDate ? `, ${formatDate(orderDate)}` : ""}
                                </span>
                                {orderDate && (
                                  <span className="od-step-sub">
                                    Your order has been placed, {formatDate(orderDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Cancelled step */}
                            <div className="od-step od-step--done od-step--cancelled">
                              <div className="od-step-dot-col">
                                <span className="od-step-dot od-step-dot--cancelled" />
                              </div>
                              <div className="od-step-text">
                                <span className="od-step-label">
                                  Cancelled{cancelledDate ? `, ${formatDate(cancelledDate)}` : ""}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          TRACKING_STEPS.map((step, i) => {
                            const done = i <= activeStep;
                            const current = i === activeStep;
                            let sub = "";
                            if (i === 0 && orderDate)
                              sub = `Your order has been placed, ${formatDate(orderDate)}`;
                            if (i === 1 && shippedDate)
                              sub = `Expected By ${formatDate(shippedDate)}`;
                            if (i === 3 && deliveryDate)
                              sub = `${formatDate(deliveryDate)}`;

                            return (
                              <div
                                className={`od-step ${done ? "od-step--done" : ""} ${current ? "od-step--current" : ""}`}
                                key={step.key}
                              >
                                <div className="od-step-dot-col">
                                  <span
                                    className={`od-step-dot ${done ? "od-step-dot--done" : ""}`}
                                  />
                                  {i < TRACKING_STEPS.length - 1 && (
                                    <span
                                      className={`od-step-line ${done && i < activeStep ? "od-step-line--done" : ""}`}
                                    />
                                  )}
                                </div>
                                <div className="od-step-text">
                                  <span className="od-step-label">
                                    {step.label}
                                    {current && (
                                      <span className="od-step-badge">
                                        {i === 0 ? ", Today" : ""}
                                      </span>
                                    )}
                                  </span>
                                  {sub && (
                                    <span className="od-step-sub">{sub}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <button type="button" className="od-see-updates" onClick={() => setShowUpdatesModal(true)}>
                        See All Updates &gt;
                      </button>
                    </div>
                  );
                })
              ) : (
                /* Fallback when items aren't in the response */
                <div className="od-card">
                  <div className="od-product-row">
                    <div className="od-product-info">
                      <div className="od-product-name">
                        Order #{order.id || orderId}
                      </div>
                      <div className="od-product-price">
                        ₹{formatCurrency(totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="od-timeline">
                    {isCancelled ? (
                      <>
                        <div className="od-step od-step--done">
                          <div className="od-step-dot-col">
                            <span className="od-step-dot od-step-dot--done" />
                            <span className="od-step-line od-step-line--cancelled" />
                          </div>
                          <div className="od-step-text">
                            <span className="od-step-label">
                              Order Confirmed{orderDate ? `, ${formatDate(orderDate)}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="od-step od-step--done od-step--cancelled">
                          <div className="od-step-dot-col">
                            <span className="od-step-dot od-step-dot--cancelled" />
                          </div>
                          <div className="od-step-text">
                            <span className="od-step-label">
                              Cancelled{cancelledDate ? `, ${formatDate(cancelledDate)}` : ""}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      TRACKING_STEPS.map((step, i) => {
                        const done = i <= activeStep;
                        const current = i === activeStep;
                        let sub = "";
                        if (i === 0 && orderDate)
                          sub = `Your order has been placed, ${formatDate(orderDate)}`;
                        if (i === 1 && shippedDate)
                          sub = `Expected By ${formatDate(shippedDate)}`;
                        if (i === 3 && deliveryDate)
                          sub = `${formatDate(deliveryDate)}`;

                        return (
                          <div
                            className={`od-step ${done ? "od-step--done" : ""} ${current ? "od-step--current" : ""}`}
                            key={step.key}
                          >
                            <div className="od-step-dot-col">
                              <span
                                className={`od-step-dot ${done ? "od-step-dot--done" : ""}`}
                              />
                              {i < TRACKING_STEPS.length - 1 && (
                                <span
                                  className={`od-step-line ${done && i < activeStep ? "od-step-line--done" : ""}`}
                                />
                              )}
                            </div>
                            <div className="od-step-text">
                              <span className="od-step-label">
                                {step.label}
                                {current && (
                                  <span className="od-step-badge">
                                    {i === 0 ? ", Today" : ""}
                                  </span>
                                )}
                              </span>
                              {sub && (
                                <span className="od-step-sub">{sub}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button type="button" className="od-see-updates" onClick={() => setShowUpdatesModal(true)}>
                    See All Updates &gt;
                  </button>
                </div>
              )}

              {/* Delivery exec note */}
              {!isDelivered && !isCancelled && (
                <div className="od-card od-note">
                  Delivery Executive details will be available once the order is
                  out for delivery
                </div>
              )}

              {/* Action buttons */}
              {!isCancelled && !isDelivered && (
                <div className="od-card od-actions">
                  <button
                    type="button"
                    className="od-action-btn od-action-cancel"
                    onClick={() => setShowCancelModal(true)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="od-action-btn od-action-chat"
                  >
                    💬 Chat with us
                  </button>
                </div>
              )}

              {isCancelled && (
                <div className="od-card od-actions od-actions--single">
                  <button
                    type="button"
                    className="od-action-btn od-action-chat"
                  >
                    💬 Chat with us
                  </button>
                </div>
              )}

              {/* Refund Status Card */}
              {isCancelled && !refundLoading && refund && (
                <div className={`od-card od-refund-card od-refund-card--${isRefundPending(refund.status) ? "pending" : (refund.status || "").toLowerCase()}`}>
                  <div className="od-refund-header">
                    <span className="od-refund-icon">
                      {refund.status === "PROCESSED" && "✅"}
                      {(refund.status === "APPROVED" || refund.status === "PROCESSING") && "🔄"}
                      {isRefundPending(refund.status) && "⏳"}
                      {(refund.status === "REJECTED" || refund.status === "FAILED") && "❌"}
                      {!isRefundPending(refund.status) && !["PROCESSED", "APPROVED", "PROCESSING", "REJECTED", "FAILED"].includes(refund.status) && "💰"}
                    </span>
                    <div className="od-refund-title">
                      {refund.status === "PROCESSED" && "Refund Completed"}
                      {refund.status === "APPROVED" && "Refund Approved"}
                      {refund.status === "PROCESSING" && "Refund Processing"}
                      {isRefundPending(refund.status) && "Refund Requested"}
                      {refund.status === "REJECTED" && "Refund Rejected"}
                      {refund.status === "FAILED" && "Refund Failed"}
                      {!isRefundPending(refund.status) && !["PROCESSED", "APPROVED", "PROCESSING", "REJECTED", "FAILED"].includes(refund.status) && "Refund Status"}
                    </div>
                  </div>

                  <div className="od-refund-body">
                    <div className="od-refund-status-badge" data-status={refund.status}>
                      {refund.status}
                    </div>

                    <div className="od-refund-desc">
                      {isRefundPending(refund.status) && "Your refund request is awaiting approval from the supplier. This usually takes 1–2 business days."}
                      {refund.status === "APPROVED" && "Your refund has been approved and is being processed. The amount will be credited to your original payment method shortly."}
                      {refund.status === "PROCESSING" && "Your refund is currently being processed via the payment gateway."}
                      {refund.status === "PROCESSED" && "Your refund has been successfully processed and credited to your payment method."}
                      {refund.status === "REJECTED" && "Your refund request was reviewed and could not be approved. Please contact support for more details."}
                      {refund.status === "FAILED" && "Refund processing failed. Please contact support for assistance."}
                    </div>

                    <div className="od-refund-details">
                      {refund.amount != null && (
                        <div className="od-refund-row">
                          <span>Refund Amount</span>
                          <span className="od-refund-amount">₹{formatCurrency(refund.amount)}</span>
                        </div>
                      )}
                      {refund.refundId && (
                        <div className="od-refund-row">
                          <span>Refund ID</span>
                          <span className="od-refund-id">{refund.refundId}</span>
                        </div>
                      )}
                      {refund.processedAt && (
                        <div className="od-refund-row">
                          <span>Processed On</span>
                          <span>{formatDateTime(refund.processedAt)}</span>
                        </div>
                      )}
                      {refund.createdAt && (
                        <div className="od-refund-row">
                          <span>Requested On</span>
                          <span>{formatDateTime(refund.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isCancelled && refundLoading && (
                <div className="od-card od-refund-loading">
                  Checking refund status…
                </div>
              )}

              {/* ═══ Rate & Review Products ═══ */}
              {isDelivered && items.length > 0 && (
                <div className="od-card od-review-section">
                  <div className="od-review-section-header">
                    <div className="od-review-section-title">Rate & Review</div>
                    <div className="od-review-section-sub">Share your experience with the products</div>
                  </div>

                  {items.map((item, idx) => {
                    const pData = productImages[item.productId] || {};
                    const name = item.productName || pData.name || "Product";
                    const img = pData.imageUrl || item.imageUrl || "";
                    const existing = reviews[item.productId];
                    const draft = reviewDrafts[item.productId] || { rating: 0, comment: "" };
                    const isOpen = expandedReview === item.productId;
                    const submitting = reviewSubmitting[item.productId];
                    const displayRating = existing?.submitted ? existing.rating : draft.rating;

                    return (
                      <div className="od-review-item" key={item.productId || idx}>
                        <div className="od-review-item-top">
                          {img ? (
                            <img className="od-review-item-img" src={img} alt={name} />
                          ) : (
                            <div className="od-review-item-img-placeholder">{name.charAt(0)}</div>
                          )}
                          <div className="od-review-item-info">
                            <div className="od-review-item-name">{name}</div>
                            {/* Star row — always visible */}
                            <div className="od-review-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  className={`od-star-btn ${displayRating >= star ? "od-star-btn--filled" : ""} ${existing?.submitted ? "od-star-btn--locked" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (existing?.submitted) return;
                                    updateDraft(item.productId, "rating", star);
                                    setExpandedReview(item.productId);
                                  }}
                                  disabled={existing?.submitted}
                                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                >
                                  ★
                                </button>
                              ))}
                              {existing?.submitted && (
                                <span className="od-review-submitted-badge">✓ Reviewed</span>
                              )}
                            </div>
                          </div>
                          {!existing?.submitted && (
                            <button
                              type="button"
                              className="od-review-expand-btn"
                              onClick={() => setExpandedReview(isOpen ? null : item.productId)}
                            >
                              {isOpen ? "▾" : "Write a review ›"}
                            </button>
                          )}
                        </div>

                        {/* Submitted review display */}
                        {existing?.submitted && existing?.comment && (
                          <div className="od-review-display">
                            <div className="od-review-display-text">"{existing.comment}"</div>
                          </div>
                        )}

                        {/* Expandable review form */}
                        {isOpen && !existing?.submitted && (
                          <div className="od-review-form">
                            <textarea
                              className="od-review-textarea"
                              placeholder="Describe your experience with this product (optional)…"
                              rows="3"
                              value={draft.comment}
                              onChange={(e) => updateDraft(item.productId, "comment", e.target.value)}
                              maxLength={1000}
                            />
                            <div className="od-review-form-footer">
                              <span className="od-review-char-count">
                                {(draft.comment || "").length}/1000
                              </span>
                              <div className="od-review-form-actions">
                                <button
                                  type="button"
                                  className="od-review-cancel-btn"
                                  onClick={() => setExpandedReview(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="od-review-submit-btn"
                                  disabled={!draft.rating || submitting}
                                  onClick={() => handleSubmitReview(item.productId)}
                                >
                                  {submitting ? "Submitting…" : "Submit Review"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rate page experience */}
              <div className="od-card od-rate">
                <div className="od-rate-title">Rate your experience</div>
                {isCancelled && (
                  <div className="od-rate-row">
                    <span className="od-rate-icon">🔄</span>
                    <span>How was your cancellation experience?</span>
                    <span className="od-rate-arrow">&gt;</span>
                  </div>
                )}
                <div className="od-rate-row">
                  <span className="od-rate-icon">👍</span>
                  <span>Did you find this page helpful?</span>
                  <span className="od-rate-arrow">&gt;</span>
                </div>
              </div>

              {/* Send order details */}
              <div className="od-card od-share">
                <span className="od-share-icon">↗</span>
                <span className="od-share-text">Send Order Details</span>
                <span className="od-share-arrow">&gt;</span>
              </div>

              {/* Order ID footer */}
              <div className="od-order-id">
                Order #{order.id || order.orderId || orderId}
                <button
                  type="button"
                  className="od-copy-btn"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      String(order.id || order.orderId || orderId)
                    )
                  }
                  aria-label="Copy order id"
                >
                  📋
                </button>
              </div>
            </>
          )}
        </section>

        {/* ===== Right Sidebar ===== */}
        <aside className="od-side">
          {!loading && !error && order && (
            <>
              {/* Delivery details */}
              <div className="od-side-card">
                <div className="od-side-heading">Delivery details</div>

                <div className="od-addr-row">
                  <span className="od-addr-icon">🏠</span>
                  <span className="od-addr-label">Home</span>
                  <span className="od-addr-value">
                    {addrLine}
                    {addrPin ? ` - ${addrPin}` : ""}
                  </span>
                  <span className="od-addr-arrow">&gt;</span>
                </div>

                <div className="od-addr-row">
                  <span className="od-addr-icon">👤</span>
                  <span className="od-addr-value">
                    {addrName} {addrPhone ? ` ${addrPhone}` : ""}
                  </span>
                  <span className="od-addr-arrow">&gt;</span>
                </div>
              </div>

              {/* Price details */}
              <div className="od-side-card">
                <div className="od-side-heading">Price details</div>

                {items.length > 0 &&
                  items.map((item, idx) => {
                    const price = item.price || item.unitPrice || 0;
                    const pMrp = productImages[item.productId]?.mrp || 0;
                    const mrp = pMrp || item.mrp || 0;
                    return (
                      <div className="od-price-row" key={item.id || idx}>
                        <span>Listing price</span>
                        <span className={mrp > price ? "od-strike" : ""}>
                          ₹{formatCurrency(mrp || price)}
                        </span>
                      </div>
                    );
                  })}

                {items.length > 0 && (
                  <div className="od-price-row">
                    <span>
                      Special price{" "}
                      <span className="od-price-info" title="Discounted price">
                        ⓘ
                      </span>
                    </span>
                    <span className="od-price-green">
                      ₹
                      {formatCurrency(
                        items.reduce(
                          (s, i) =>
                            s + (i.price || i.unitPrice || 0) * (i.quantity || 1),
                          0
                        )
                      )}
                    </span>
                  </div>
                )}

                <div className="od-price-row">
                  <span>
                    Total fees <span className="od-price-caret">▾</span>
                  </span>
                  <span>
                    ₹{formatCurrency(order?.shippingFee || order?.deliveryFee || 0)}
                  </span>
                </div>

                <div className="od-price-divider" />

                <div className="od-price-row od-price-total">
                  <span>Total amount</span>
                  <span>₹{formatCurrency(totalAmount)}</span>
                </div>

                <div className="od-price-divider" />

                <div className="od-price-row od-payment-method">
                  <span>Payment method</span>
                  <span className="od-payment-badge">
                    💳 {paymentMethod === "COD" ? "Cash On Delivery" : paymentMethod}
                  </span>
                </div>

                {paymentId && (
                  <div className="od-price-row">
                    <span>Payment ID</span>
                    <span className="od-payment-id">{paymentId}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ===== See All Updates Modal ===== */}
      {showUpdatesModal && (
        <div className="od-modal-overlay" onClick={() => setShowUpdatesModal(false)}>
          <div className="od-updates-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="od-modal-close"
              onClick={() => setShowUpdatesModal(false)}
              aria-label="Close"
            >
              ✕
            </button>
            <div className="od-updates-title">Order Updates</div>
            <div className="od-updates-list">
              {/* Order Confirmed */}
              <div className="od-update-item">
                <div className="od-update-dot-col">
                  <span className="od-update-dot od-update-dot--green" />
                  {(isCancelled || activeStep > 0) && (
                    <span className={`od-update-line ${isCancelled ? 'od-update-line--red' : 'od-update-line--green'}`} />
                  )}
                  {!isCancelled && activeStep === 0 && (
                    <span className="od-update-line" />
                  )}
                </div>
                <div className="od-update-content">
                  <div className="od-update-heading">
                    <strong>Order Confirmed</strong>
                    <span className="od-update-date">{formatDateShort(orderDate)}</span>
                  </div>
                  <div className="od-update-desc">Your Order has been placed.</div>
                  <div className="od-update-time">{formatDateTime(orderDate)}</div>
                </div>
              </div>

              {/* Shipped */}
              {!isCancelled && (
                <div className="od-update-item">
                  <div className="od-update-dot-col">
                    <span className={`od-update-dot ${activeStep >= 1 ? 'od-update-dot--green' : ''}`} />
                    <span className={`od-update-line ${activeStep >= 2 ? 'od-update-line--green' : ''}`} />
                  </div>
                  <div className="od-update-content">
                    <div className="od-update-heading">
                      <strong>Shipped</strong>
                      {shippedDate && <span className="od-update-date">{formatDateShort(shippedDate)}</span>}
                    </div>
                    {shippedDate && <div className="od-update-desc">Your item has been shipped.</div>}
                    {shippedDate && <div className="od-update-time">{formatDateTime(shippedDate)}</div>}
                  </div>
                </div>
              )}

              {/* Out for Delivery */}
              {!isCancelled && (
                <div className="od-update-item">
                  <div className="od-update-dot-col">
                    <span className={`od-update-dot ${activeStep >= 2 ? 'od-update-dot--green' : ''}`} />
                    <span className={`od-update-line ${activeStep >= 3 ? 'od-update-line--green' : ''}`} />
                  </div>
                  <div className="od-update-content">
                    <div className="od-update-heading">
                      <strong>Out For Delivery</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivered */}
              {!isCancelled && (
                <div className="od-update-item">
                  <div className="od-update-dot-col">
                    <span className={`od-update-dot ${activeStep >= 3 ? 'od-update-dot--green' : ''}`} />
                  </div>
                  <div className="od-update-content">
                    <div className="od-update-heading">
                      <strong>Delivered</strong>
                      {deliveryDate && <span className="od-update-date">{formatDateShort(deliveryDate)}</span>}
                    </div>
                    {order?.deliveredAt && <div className="od-update-time">{formatDateTime(order.deliveredAt)}</div>}
                  </div>
                </div>
              )}

              {/* Cancelled */}
              {isCancelled && (
                <div className="od-update-item">
                  <div className="od-update-dot-col">
                    <span className="od-update-dot od-update-dot--red" />
                  </div>
                  <div className="od-update-content">
                    <div className="od-update-heading">
                      <strong>Cancelled</strong>
                      <span className="od-update-date">{formatDateShort(cancelledDate || orderDate)}</span>
                    </div>
                    <div className="od-update-desc">
                      Your request is being processed. It may take up to 4 hours for your refund (if any) to be initiated.
                    </div>
                    <div className="od-update-time">{formatDateTime(cancelledDate || orderDate)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Cancel Confirmation Modal ===== */}
      {showCancelModal && (
        <div className="od-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="od-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="od-modal-close"
              onClick={() => setShowCancelModal(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="od-modal-top">
              <div className="od-modal-savings">
                <span className="od-modal-savings-icon">💰</span>
                <span>
                  {savings > 0
                    ? `You saved ₹${formatCurrency(savings)} on this order!`
                    : "Are you sure you want to cancel?"}
                </span>
              </div>
              {firstItemImg && (
                <img
                  className="od-modal-product-img"
                  src={firstItemImg}
                  alt="Product"
                />
              )}
            </div>

            <div className="od-modal-warning">
              If you cancel now, you may not be able to avail this deal again. Do you still want to cancel?
            </div>

            <div className="od-modal-actions">
              <button
                type="button"
                className="od-modal-btn od-modal-btn--keep"
                onClick={() => setShowCancelModal(false)}
              >
                Don&apos;t cancel
              </button>
              <button
                type="button"
                className="od-modal-btn od-modal-btn--cancel"
                onClick={() => {
                  setShowCancelModal(false);
                  navigate(`/orders/${orderId}/cancel`);
                }}
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
