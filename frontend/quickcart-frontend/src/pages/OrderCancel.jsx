import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./OrderCancel.css";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "-";
  return Number(value).toLocaleString("en-IN");
}

const CANCEL_REASONS = [
  "Order placed by mistake",
  "Found a better price elsewhere",
  "Item no longer needed",
  "Delivery time is too long",
  "Want to change product/size/color",
  "Duplicate order",
  "My reasons are not listed here",
];

const REFUND_MODES = [
  { key: "ORIGINAL", label: "Original Payment Mode", desc: "Refund to your original payment method" },
  { key: "WALLET", label: "QuickCart Wallet", desc: "Instant refund to your QuickCart wallet" },
];

export default function OrderCancel() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [productInfo, setProductInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Step state
  const [activeStep, setActiveStep] = useState(1);
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const [refundMode, setRefundMode] = useState("ORIGINAL");
  const [submitting, setSubmitting] = useState(false);

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
        const data = res?.data || null;
        setOrder(data);

        // Fetch product images
        const items = data?.items || [];
        const infoMap = {};
        await Promise.allSettled(
          items.map(async (item) => {
            if (!item.productId) return;
            try {
              const pRes = await api.get(`/products/${item.productId}`);
              const p = pRes?.data;
              infoMap[item.productId] = {
                imageUrl: p?.imageUrl || p?.image || "",
                brand: p?.brand || "",
                name: p?.name || "",
              };
            } catch {
              // skip
            }
          })
        );
        if (isMounted) setProductInfo(infoMap);
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

  const handleContinue = () => {
    if (!reason) return;
    setActiveStep(2);
  };

  const handleSubmitCancellation = async () => {
    setSubmitting(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      navigate(`/orders/${orderId}`, { replace: true });
    } catch {
      alert("Failed to cancel order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const items = order?.items || [];
  const totalAmount = order?.totalAmount || order?.amount || 0;

  if (loading) {
    return (
      <div className="oc-page">
        <div className="oc-loading">Loading order details…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="oc-page">
        <div className="oc-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="oc-page">
      {/* Breadcrumb */}
      <div className="oc-breadcrumb">
        <button type="button" onClick={() => navigate("/retailer/orders")}>
          My Orders
        </button>
        <span className="oc-breadcrumb-sep">›</span>
        <button type="button" onClick={() => navigate(`/orders/${orderId}`)}>
          #{orderId}
        </button>
        <span className="oc-breadcrumb-sep">›</span>
        <span className="oc-breadcrumb-active">Cancel</span>
      </div>

      <div className="oc-layout">
        {/* ===== Left: Steps ===== */}
        <section className="oc-main">
          {/* ── Step 1 ── */}
          <div className={`oc-step-card ${activeStep === 1 ? "oc-step-card--active" : ""}`}>
            <div className="oc-step-header" onClick={() => activeStep > 1 && setActiveStep(1)}>
              <span className={`oc-step-num ${activeStep > 1 ? "oc-step-num--done" : ""}`}>
                {activeStep > 1 ? "✓" : "1"}
              </span>
              <span className="oc-step-title">CANCELLATION REASON</span>
              {activeStep > 1 && (
                <button type="button" className="oc-change-btn" onClick={() => setActiveStep(1)}>
                  CHANGE
                </button>
              )}
            </div>

            {activeStep === 1 && (
              <div className="oc-step-body">
                {activeStep > 1 ? (
                  <div className="oc-step-summary">
                    Reason: <strong>{reason}</strong>
                  </div>
                ) : (
                  <>
                    <label className="oc-label">
                      Reason for Cancellation <span className="oc-required">*</span>
                    </label>
                    <div className="oc-select-wrap">
                      <select
                        className="oc-select"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      >
                        <option value="" disabled>
                          Select Reason
                        </option>
                        {CANCEL_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="oc-label oc-label--mt">
                      Comments <span className="oc-optional">(optional)</span>
                    </label>
                    <textarea
                      className="oc-textarea"
                      rows={4}
                      placeholder="eg: Item not required anymore."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                    />

                    <div className="oc-step-actions">
                      <button
                        type="button"
                        className="oc-btn oc-btn--primary"
                        disabled={!reason}
                        onClick={handleContinue}
                      >
                        CONTINUE
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeStep > 1 && (
              <div className="oc-step-body oc-step-body--collapsed">
                <span className="oc-step-done-text">
                  Reason: <strong>{reason}</strong>
                  {comments && <> — {comments}</>}
                </span>
              </div>
            )}
          </div>

          {/* ── Step 2 ── */}
          <div className={`oc-step-card ${activeStep === 2 ? "oc-step-card--active" : ""} ${activeStep < 2 ? "oc-step-card--locked" : ""}`}>
            <div className="oc-step-header">
              <span className="oc-step-num">2</span>
              <span className="oc-step-title">REFUND MODE</span>
            </div>

            {activeStep === 2 && (
              <div className="oc-step-body">
                <div className="oc-refund-label">Select a Mode of Refund</div>

                <div className="oc-refund-options">
                  {REFUND_MODES.map((mode) => (
                    <label
                      key={mode.key}
                      className={`oc-refund-option ${refundMode === mode.key ? "oc-refund-option--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="refundMode"
                        value={mode.key}
                        checked={refundMode === mode.key}
                        onChange={() => setRefundMode(mode.key)}
                        className="oc-radio"
                      />
                      <div className="oc-refund-text">
                        <span className="oc-refund-name">{mode.label}</span>
                        <span className="oc-refund-desc">{mode.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="oc-terms">
                  By clicking &quot;Request Cancellation&quot;, I agree to the{" "}
                  <button type="button" className="oc-terms-link">
                    Terms and Conditions
                  </button>{" "}
                  of refunds.
                </div>

                <div className="oc-step-actions">
                  <button
                    type="button"
                    className="oc-btn oc-btn--danger"
                    onClick={handleSubmitCancellation}
                    disabled={submitting}
                  >
                    {submitting ? "PROCESSING…" : "REQUEST CANCELLATION"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===== Right: Item Details ===== */}
        <aside className="oc-side">
          <div className="oc-side-card">
            <div className="oc-side-heading">ITEM DETAILS</div>

            {items.map((item, idx) => {
              const pData = productInfo[item.productId] || {};
              const name = item.productName || pData.name || "Product";
              const img = pData.imageUrl || "";
              const price = item.price || item.unitPrice || 0;
              const qty = item.quantity || 1;

              return (
                <div className="oc-item" key={item.productId || idx}>
                  <div className="oc-item-info">
                    <div className="oc-item-name">{name}</div>
                    <div className="oc-item-qty">Qty: {qty}</div>
                    <div className="oc-item-price">₹{formatCurrency(price)}</div>
                  </div>
                  {img ? (
                    <img className="oc-item-img" src={img} alt={name} />
                  ) : (
                    <div className="oc-item-img-placeholder">
                      {name?.charAt(0) || "P"}
                    </div>
                  )}
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="oc-item">
                <div className="oc-item-info">
                  <div className="oc-item-name">Order #{orderId}</div>
                  <div className="oc-item-price">₹{formatCurrency(totalAmount)}</div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
