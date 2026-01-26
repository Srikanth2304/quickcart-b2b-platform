import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./OrderSuccess.css";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString();
}

export default function OrderSuccess() {
  const navigate = useNavigate();
  const query = useQuery();
  const orderId = query.get("orderId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [paymentId, setPaymentId] = useState("");
  const resolvedPaymentId = paymentId || order?.payment?.paymentId || order?.paymentId || order?.razorpayPaymentId || "";

  const deliveryDate =
    order?.deliveryDate ||
    order?.expectedDeliveryDate ||
    order?.deliveryEta ||
    "";

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    let isMounted = true;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    try {
      const stored = sessionStorage.getItem(`order-payment-${orderId}`);
      setPaymentId(stored || "");
    } catch (storageError) {
      setPaymentId("");
    }

    const fetchOrder = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/orders/${orderId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
        });
        if (!isMounted) return;
        setOrder(response?.data || null);
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to load order details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId, navigate]);

  if (!orderId) return null;

  return (
    <div className="order-success-page">
      <div className="order-success-layout">
        <section className="order-success-main">
          <div className="order-success-card">
            {loading && <div className="order-success-state">Loading order details...</div>}
            {!loading && error && <div className="order-success-error">{error}</div>}
            {!loading && !error && order && (
              <>
                <div className="order-success-hero">
                  <div>
                    <div className="order-success-title">Thanks for shopping with us!</div>
                    <div className="order-success-sub">
                      {deliveryDate ? `Delivery by ${deliveryDate}` : "Delivery scheduled"}
                    </div>
                    <button
                      type="button"
                      className="order-success-link"
                      onClick={() => navigate(`/orders/${orderId}`)}
                    >
                      Track & manage order
                    </button>
                  </div>
                  <div className="order-success-check">✓</div>
                </div>

                <div className="order-success-bar">
                  <span>Delivery by {deliveryDate || "TBD"}</span>
                </div>

                <button
                  type="button"
                  className="order-success-cta"
                  onClick={() => navigate("/retailer/products")}
                >
                  Continue Shopping
                </button>

                <div className="order-success-section">
                  <div className="order-success-section-title">Send Order Details</div>
                  <div className="order-success-row">
                    <span>Order ID</span>
                    <strong>{order.id || order.orderId}</strong>
                  </div>
                  <div className="order-success-row">
                    <span>Payment ID</span>
                    <div className="order-success-copy">
                      <button
                        type="button"
                        className="order-success-copy-btn"
                        onClick={() => {
                          if (!resolvedPaymentId) return;
                          navigator.clipboard.writeText(resolvedPaymentId);
                        }}
                        aria-label="Copy payment id"
                      >
                        ⧉
                      </button>
                      <strong>{resolvedPaymentId || "-"}</strong>
                    </div>
                  </div>
                  <div className="order-success-row">
                    <span>Total Amount</span>
                    <strong>₹{formatCurrency(order.totalAmount || order.amount)}</strong>
                  </div>
                  <div className="order-success-row">
                    <span>Order Status</span>
                    <strong>{order.status || "-"}</strong>
                  </div>
                </div>

                <div className="order-success-section">
                  <div className="order-success-section-title">You might be also interested in</div>
                  <div className="order-success-reco">
                    {[
                      "Power Banks",
                      "Smart Watches",
                      "Men's Sports Shoes",
                      "Pen Drives",
                      "Covers",
                    ].map((label) => (
                      <div key={label} className="order-success-reco-card">
                        <div className="order-success-reco-img">%</div>
                        <div className="order-success-reco-text">Min. 50% Off</div>
                        <div className="order-success-reco-sub">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="order-success-warning">
                  Beware of fraudulent calls & messages! We don't ask for OTP/pin for offers.
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="order-success-side">
          <div className="order-success-side-card">
            <div className="order-success-side-title">Just click! to check the orders</div>
            <button type="button" onClick={() => navigate(`/orders/${orderId}`)}>
              Go to My Orders
            </button>
          </div>
          <div className="order-success-side-card">
            <div className="order-success-side-title">Delivery Address</div>
            <div className="order-success-address">
              {(order?.deliveryName || order?.deliveryAddress?.name || order?.address?.name || "Customer").trim()}
              <br />
              {[
                order?.deliveryAddressLine1 ||
                  order?.deliveryAddress?.addressLine1 ||
                  order?.address?.addressLine1,
                order?.deliveryCity || order?.deliveryAddress?.city,
                order?.deliveryState || order?.deliveryAddress?.state,
              ]
                .filter(Boolean)
                .join(", ")}
              {(order?.deliveryPincode || order?.deliveryAddress?.pincode)
                ? ` - ${order?.deliveryPincode || order?.deliveryAddress?.pincode}`
                : ""}
              {(order?.deliveryPhone || order?.deliveryAddress?.phone)
                ? `\nPhone: ${order?.deliveryPhone || order?.deliveryAddress?.phone}`
                : ""}
            </div>
            <button type="button" className="order-success-link">Change</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
