import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { showToast } from "../utils/notify";
import Loader from "../components/Loader";
import "./OrderDetails.css";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value)))
    return "-";
  return Number(value).toLocaleString("en-IN");
}

function unwrapApiData(responseData) {
  if (!responseData || typeof responseData !== "object") return responseData;
  if (responseData.data !== undefined) return responseData.data;
  return responseData;
}

const SHIPMENT_STEPS = ["CREATED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];

const RETURN_CONDITIONS = ["GOOD", "DAMAGED", "OPEN_BOX"];

const CANCEL_REASONS = [
  "Changed my mind",
  "Found a better price",
  "Delivery is too late",
  "Ordered by mistake",
  "Other",
];

const REFUND_MODES = ["ORIGINAL", "BANK_TRANSFER", "WALLET"];

function normalizeOrderStatus(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s === "PAID") return "CONFIRMED";
  return s;
}

function normalizePaymentStatus(status) {
  const s = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  if (s === "SUCCESSFUL") return "SUCCESS";
  return s;
}

function isRefundPending(status) {
  const s = (status || "").toUpperCase();
  return s === "PENDING" || s === "PENDING_APPROVAL";
}

function getStepIndex(status) {
  const s = normalizeOrderStatus(status);
  if (s.includes("DELIVER") && !s.includes("OUT")) return 4;
  if (s.includes("OUT")) return 3;
  if (s.includes("SHIP")) return 3;
  if (s.includes("ACCEPT")) return 2;
  if (s.includes("CONFIRM")) return 1;
  return 0; // PAYMENT_PENDING or CREATED
}

function getOrderProgressFlags(status) {
  const s = normalizeOrderStatus(status);
  const delivered = s.includes("DELIVER") && !s.includes("OUT");
  const outForDelivery = s.includes("OUT") || delivered;
  const shipped = s.includes("SHIP") || outForDelivery;
  const accepted = s.includes("ACCEPT") || shipped;
  return { accepted, shipped, outForDelivery, delivered };
}

function buildOrderTimelineSteps({
  isCodOrder,
  paymentStatus,
  status,
  orderDate,
  confirmedDate,
  acceptedDate,
  shippedDate,
  outForDeliveryDate,
  deliveryDate,
  paymentCollectedDate,
}) {
  const payment = normalizePaymentStatus(paymentStatus);
  const { accepted, shipped, outForDelivery, delivered } = getOrderProgressFlags(status);

  const steps = isCodOrder
    ? [
        { key: "ORDER_PLACED", label: "Order Placed", done: true, sub: orderDate ? `Your order has been placed, ${formatDate(orderDate)}` : "" },
        { key: "ACCEPTED", label: "Accepted by Seller", done: accepted, sub: acceptedDate ? `Seller accepted your order, ${formatDate(acceptedDate)}` : "" },
        { key: "SHIPPED", label: "Shipped", done: shipped, sub: shippedDate ? `Shipped on ${formatDate(shippedDate)}` : "" },
        { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", done: outForDelivery, sub: outForDeliveryDate ? `Out for delivery on ${formatDate(outForDeliveryDate)}` : "" },
        { key: "DELIVERED", label: "Delivered", done: delivered, sub: deliveryDate ? formatDate(deliveryDate) : "" },
        { key: "PAYMENT_COLLECTED", label: "Payment Collected", done: payment === "COLLECTED", sub: paymentCollectedDate ? `Collected on ${formatDate(paymentCollectedDate)}` : "" },
      ]
    : [
        { key: "ORDER_PLACED", label: "Order Placed", done: true, sub: orderDate ? `Your order has been placed, ${formatDate(orderDate)}` : "" },
        ...(payment === "SUCCESS"
          ? [{ key: "PAYMENT_CONFIRMED", label: "Payment Confirmed", done: true, sub: confirmedDate ? `Payment confirmed, ${formatDate(confirmedDate)}` : "" }]
          : []),
        { key: "ACCEPTED", label: "Accepted by Seller", done: accepted, sub: acceptedDate ? "Seller accepted your order" : "" },
        { key: "SHIPPED", label: "Shipped", done: shipped, sub: shippedDate ? `Shipped on ${formatDate(shippedDate)}` : "" },
        { key: "DELIVERED", label: "Delivered", done: delivered, sub: deliveryDate ? formatDate(deliveryDate) : "" },
      ];

  const firstPendingIndex = steps.findIndex((step) => !step.done);
  const currentIndex = firstPendingIndex === -1 ? steps.length - 1 : firstPendingIndex;
  return steps.map((step, index) => ({ ...step, current: index === currentIndex }));
}

function getPaymentStatusLabel(paymentStatus) {
  const s = normalizePaymentStatus(paymentStatus);
  if (s === "SUCCESS") return "Payment Confirmed";
  if (s === "PENDING_COLLECTION") return "Pending Collection";
  if (s === "COLLECTED") return "Payment Collected";
  if (s === "REFUNDED") return "Refund Completed";
  return s || "-";
}

function getShipmentStepIndex(status) {
  const raw = (status || "").toUpperCase().replace(/[\s-]/g, "_");
  const normalized = raw === "SHIPPED" ? "IN_TRANSIT" : raw;
  const idx = SHIPMENT_STEPS.findIndex((step) => step === normalized);
  return idx >= 0 ? idx : -1;
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
  const [shipment, setShipment] = useState(null);
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentError, setShipmentError] = useState("");

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnItemId, setReturnItemId] = useState("");
  const [returnedQuantity, setReturnedQuantity] = useState(1);
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [returnReason, setReturnReason] = useState("Damaged item");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnId, setReturnId] = useState("");
  const [returnData, setReturnData] = useState(null);
  const [returnTrackingLoading, setReturnTrackingLoading] = useState(false);

  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelComments, setCancelComments] = useState("");
  const [cancelRefundMode, setCancelRefundMode] = useState("ORIGINAL");

  /* Review state */
  const [reviews, setReviews] = useState({});        // { productId: { rating, comment, submitted } }
  const [reviewDrafts, setReviewDrafts] = useState({}); // { productId: { rating, comment } }
  const [reviewSubmitting, setReviewSubmitting] = useState({});
  const [expandedReview, setExpandedReview] = useState(null); // productId of open review form
  const [editingReview, setEditingReview] = useState(null);   // productId currently being edited
  const [refundRefreshing, setRefundRefreshing] = useState(false);

  /* Helper: refresh refund status */
  const refreshRefund = async () => {
    if (!orderId) return;
    setRefundRefreshing(true);
    try {
      const res = await api.get(`/orders/${orderId}/refund`);
      setRefund(unwrapApiData(res?.data) || null);
    } catch {
      // no refund yet
    } finally {
      setRefundRefreshing(false);
    }
  };

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
        const orderData = unwrapApiData(res?.data) || null;
        setOrder(orderData);

        // Fetch product details for each item
        const orderItems = orderData?.items || orderData?.orderItems || [];
        const imgMap = {};
        await Promise.allSettled(
          orderItems.map(async (item) => {
            if (!item.productId) return;
            try {
              const pRes = await api.get(`/products/${item.productId}`);
              const p = unwrapApiData(pRes?.data) || {};
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

        // Fetch existing reviews only for delivered orders (review section is only visible then)
        const orderStatusUpper = (orderData?.status || "").toUpperCase();
        const isOrderDelivered = orderStatusUpper.includes("DELIVER") && !orderStatusUpper.includes("OUT");
        if (isOrderDelivered) {
          const revMap = {};
          await Promise.allSettled(
            orderItems.map(async (item) => {
              if (!item.productId) return;
              try {
                const rRes = await api.get(`/products/${item.productId}/reviews/my`, {
                  validateStatus: () => true, // never throw — we inspect status ourselves
                });
                const reviewPayload = unwrapApiData(rRes?.data) || {};
                if (rRes?.status === 200 && reviewPayload && reviewPayload.rating) {
                  revMap[item.productId] = {
                    rating: reviewPayload.rating,
                    comment: reviewPayload.comment || reviewPayload.review || "",
                    submitted: true,
                  };
                }
                // Any non-200 (404, 500, etc.) → no review yet — normal state
              } catch {
                // Network error — silently skip, user can still write a review
              }
            })
          );
          if (isMounted) setReviews(revMap);
        }

        // Fetch refund info if order is cancelled/rejected (always attempt)
        const orderStatus = (orderData?.status || "").toUpperCase();
        if (orderStatus.includes("CANCEL") || orderStatus.includes("REJECT")) {
          try {
            setRefundLoading(true);
            const refundRes = await api.get(`/orders/${orderId}/refund`);
            if (isMounted) setRefund(unwrapApiData(refundRes?.data) || null);
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

  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;

    const fetchShipment = async () => {
      setShipmentLoading(true);
      setShipmentError("");
      try {
        const res = await api.get(`/shipments/${orderId}`);
        if (!isMounted) return;
        setShipment(unwrapApiData(res?.data) || null);
      } catch (err) {
        if (!isMounted) return;
        if (err?.response?.status === 404) {
          setShipment(null);
          setShipmentError("");
        } else {
          setShipment(null);
          setShipmentError(err?.response?.data?.message || "Failed to load shipment details.");
        }
      } finally {
        if (isMounted) setShipmentLoading(false);
      }
    };

    fetchShipment();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  /* Auto-poll refund status when refund is in a non-final state */
  useEffect(() => {
    if (!orderId || !order) return;
    const orderStatus = (order.status || "").toUpperCase();
    const isCancelledOrRejected = orderStatus.includes("CANCEL") || orderStatus.includes("REJECT");
    if (!isCancelledOrRejected) return;

    // No refund for COD orders
    const isCod = (order?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY";
    if (isCod) return;

    // Only poll when refund is in a transitional state (or no refund yet)
    const refundStatus = (refund?.status || "").toUpperCase();
    const isFinal = ["PROCESSED", "REJECTED", "FAILED"].includes(refundStatus);
    if (isFinal) return;

    const controller = new AbortController();
    let errorCount = 0;
    const MAX_ERRORS = 10;
    const BASE_DELAY = 15000; // 15s

    const poll = async () => {
      try {
        const res = await api.get(`/orders/${orderId}/refund`, {
          signal: controller.signal,
        });
        const newRefund = unwrapApiData(res?.data) || null;
        errorCount = 0; // reset on success
        setRefund((prev) => {
          if (prev?.status !== newRefund?.status) return newRefund;
          return prev;
        });
      } catch (err) {
        if (err?.name === "CanceledError" || controller.signal.aborted) return;
        errorCount++;
      }

      // Stop polling after too many consecutive errors
      if (errorCount >= MAX_ERRORS || controller.signal.aborted) return;

      // Exponential backoff on errors
      const delay = errorCount > 0 ? BASE_DELAY * Math.pow(1.5, errorCount) : BASE_DELAY;
      timerId = setTimeout(poll, Math.min(delay, 120000)); // cap at 2 min
    };

    let timerId = setTimeout(poll, BASE_DELAY);

    return () => {
      controller.abort();
      clearTimeout(timerId);
    };
  }, [orderId, order?.status, refund?.status]);

  const handleCancelOrder = async () => {
    const payload = {
      reason: cancelReason,
      comments: cancelComments,
      refundMode: cancelRefundMode,
    };

    setCancelling(true);
    try {
      await api.post(`/api/orders/${orderId}/cancel`, payload);
      // Re-fetch the full order to get accurate status
      try {
        const res = await api.get(`/orders/${orderId}`);
        setOrder(unwrapApiData(res?.data) || null);
      } catch {
        setOrder((prev) => {
          if (!prev) return prev;
          const nextPaymentStatus = (prev?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY"
            ? prev?.paymentStatus
            : "REFUNDED";
          return { ...prev, status: "CANCELLED", paymentStatus: nextPaymentStatus };
        });
      }
      setShowCancelModal(false);
      showToast(
        isCodOrder
          ? "Order cancelled successfully."
          : "Order cancelled successfully. Refund initiated.",
        "success"
      );
      // Fetch refund data (backend may auto-create refund on cancel)
      try {
        const rRes = await api.get(`/orders/${orderId}/refund`);
        setRefund(unwrapApiData(rRes?.data) || null);
      } catch {
        // refund not yet created — polling will pick it up
      }
    } catch (err) {
      if (!navigator.onLine || err?.code === "ERR_NETWORK") {
        showToast("No internet connection. Please try again.", "error");
      } else {
        const apiMessage = err?.response?.data?.message || "";
        const message = /shipp|deliver/i.test(apiMessage)
          ? "Order cannot be cancelled after shipment."
          : (apiMessage || "Failed to cancel order. Please try again.");
        showToast(message, "error");
      }
    } finally {
      setCancelling(false);
    }
  };

  /* Submit a review (create or update — backend upserts) */
  const handleSubmitReview = async (productId) => {
    const draft = reviewDrafts[productId];
    if (!draft?.rating) return;
    setReviewSubmitting((p) => ({ ...p, [productId]: true }));
    try {
      await api.post(`/products/${productId}/reviews`, {
        rating: draft.rating,
        comment: draft.comment || "",
      });
      setReviews((p) => ({ ...p, [productId]: { rating: draft.rating, comment: draft.comment || "", submitted: true } }));
      setExpandedReview(null);
      setEditingReview(null);
    } catch {
      showToast("Failed to submit review. Please try again.", "error");
    } finally {
      setReviewSubmitting((p) => ({ ...p, [productId]: false }));
    }
  };

  /* Enter edit mode — populate draft from existing review */
  const handleEditReview = (productId) => {
    const existing = reviews[productId];
    if (!existing) return;
    setReviewDrafts((p) => ({
      ...p,
      [productId]: { rating: existing.rating, comment: existing.comment || "" },
    }));
    setEditingReview(productId);
    setExpandedReview(productId);
  };

  /* Cancel edit — restore to submitted state */
  const handleCancelEdit = (productId) => {
    setEditingReview(null);
    setExpandedReview(null);
  };

  const updateDraft = (productId, field, value) => {
    setReviewDrafts((p) => ({
      ...p,
      [productId]: { ...(p[productId] || { rating: 0, comment: "" }), [field]: value },
    }));
  };

  const handleOpenReturnForm = () => {
    const orderItems = order?.items || order?.orderItems || [];
    if (orderItems.length === 0) {
      showToast("No order items available for return", "error");
      return;
    }
    const firstItem = orderItems[0];
    const firstItemId = String(firstItem?.orderItemId || firstItem?.id || "");
    if (!firstItemId) {
      showToast("Return is not available for this item", "error");
      return;
    }
    setReturnItemId(firstItemId);
    setReturnedQuantity(1);
    setReturnCondition("GOOD");
    setReturnReason("Damaged item");
    setReturnError("");
    setShowReturnForm(true);
  };

  const fetchReturnById = async (nextReturnId) => {
    if (!nextReturnId) return;
    setReturnTrackingLoading(true);
    try {
      const res = await api.get(`/returns/${nextReturnId}`);
      setReturnData(unwrapApiData(res?.data) || null);
    } catch (err) {
      setReturnData(null);
    } finally {
      setReturnTrackingLoading(false);
    }
  };

  const handleSubmitReturnRequest = async () => {
    const orderItems = order?.items || order?.orderItems || [];
    const selectedItem = orderItems.find((item) => String(item?.orderItemId || item?.id || "") === String(returnItemId));

    if (!selectedItem) {
      setReturnError("Please select a valid item.");
      showToast("Please select a valid item", "error");
      return;
    }

    const deliveredQty = Number(selectedItem?.deliveredQuantity ?? selectedItem?.quantity ?? 0);
    const qty = Number(returnedQuantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      setReturnError("Returned quantity must be greater than 0.");
      showToast("Returned quantity must be greater than 0", "error");
      return;
    }

    if (!Number.isFinite(deliveredQty) || qty > deliveredQty) {
      setReturnError("Returned quantity cannot exceed delivered quantity.");
      showToast("Returned quantity cannot exceed delivered quantity", "error");
      return;
    }

    setReturnSubmitting(true);
    setReturnError("");
    try {
      const createReturnRes = await api.post("/returns", {
        orderId,
        orderItemId: selectedItem?.orderItemId || selectedItem?.id,
        returnedQuantity: qty,
        condition: returnCondition,
        reason: returnReason,
      });
      const returnPayload = unwrapApiData(createReturnRes?.data) || {};
      const createdReturnId = returnPayload?.id || returnPayload?.returnId || "";
      if (createdReturnId) {
        setReturnId(String(createdReturnId));
        await fetchReturnById(createdReturnId);
      }
      showToast("Return request submitted", "success");
      setShowReturnForm(false);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to submit return request.";
      setReturnError(msg);
      showToast(msg, "error");
    } finally {
      setReturnSubmitting(false);
    }
  };

  if (!orderId) return null;

  const status = normalizeOrderStatus(order?.status || "");
  const activeStep = getStepIndex(status);
  const isDelivered = status.includes("DELIVER") && !status.includes("OUT");
  const statusUpper = normalizeOrderStatus(status);
  const isCancelled = statusUpper.includes("CANCEL");
  const isRejected = statusUpper.includes("REJECT");
  const isCancelledOrRejected = isCancelled || isRejected;

  // Cancel allowed only before SHIPPED/DELIVERED/CANCELLED
  const CANCELLABLE = ["PLACED", "PAID", "CONFIRMED", "ACCEPTED", "CREATED", "PAYMENT_PENDING"];
  const canCancel = CANCELLABLE.includes(statusUpper);
  const hasShipmentTrackingStarted =
    statusUpper.includes("SHIP") ||
    statusUpper.includes("OUT") ||
    (statusUpper.includes("DELIVER") && !statusUpper.includes("OUT"));
  const canChangeAddress = canCancel && !isCancelledOrRejected;

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
  const paymentStatus = normalizePaymentStatus(order?.paymentStatus || order?.payment?.status || "");
  const isCodOrder = (order?.paymentMethod || "").toUpperCase() === "CASH_ON_DELIVERY";
  const canViewInvoice = (!isCodOrder && (paymentStatus === "SUCCESS" || paymentStatus === "REFUNDED")) || (isCodOrder && paymentStatus === "COLLECTED");

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

  const shipmentStatus = (shipment?.shipmentStatus || shipment?.status || "").toUpperCase().replace(/[\s-]/g, "_");
  const shipmentTrackingNumber = shipment?.trackingNumber || "";
  const shipmentCarrierName = shipment?.carrierName || shipment?.carrier || "";
  const shipmentTrackingUrl = shipment?.trackingUrl || "";
  const shipmentEstimatedDeliveryDate = shipment?.estimatedDeliveryDate || "";
  const shipmentDeliveredAt = shipment?.deliveredAt || "";
  const shipmentStepIndex = getShipmentStepIndex(shipmentStatus);
  const confirmedDate = order?.confirmedAt || order?.paidAt || "";
  const acceptedDate = order?.acceptedAt || "";
  const outForDeliveryDate = order?.outForDeliveryAt || shipment?.outForDeliveryAt || "";
  const paymentCollectedDate = order?.paymentCollectedAt || (paymentStatus === "COLLECTED" ? (order?.updatedAt || deliveryDate || "") : "");
  const orderTimelineSteps = buildOrderTimelineSteps({
    isCodOrder,
    paymentStatus,
    status,
    orderDate,
    confirmedDate,
    acceptedDate,
    shippedDate,
    outForDeliveryDate,
    deliveryDate,
    paymentCollectedDate,
  });

  const handleChangeAddress = () => {
    navigate("/retailer/bag");
  };

  return (
    <div className="od-page">
      <div className="od-layout">
        {/* ===== Main Section ===== */}
        <section className="od-main">
          {loading && (
            <div className="od-card od-state"><Loader text="Loading order details…" /></div>
          )}
          {!loading && error && (
            <div className="od-card od-error">{error}</div>
          )}

          {!loading && !error && order && (
            <>

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
                        {isCancelledOrRejected ? (
                          <>
                            {/* Confirmed step */}
                            <div className="od-step od-step--done">
                              <div className="od-step-dot-col">
                                <span className="od-step-dot od-step-dot--done" />
                                <span className="od-step-line od-step-line--cancelled" />
                              </div>
                              <div className="od-step-text">
                                <span className="od-step-label">
                                  Order Placed, Today{orderDate ? `, ${formatDate(orderDate)}` : ""}
                                </span>
                                {orderDate && (
                                  <span className="od-step-sub">
                                    Your order has been placed, {formatDate(orderDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Cancelled / Rejected step */}
                            <div className="od-step od-step--done od-step--cancelled">
                              <div className="od-step-dot-col">
                                <span className="od-step-dot od-step-dot--cancelled" />
                              </div>
                              <div className="od-step-text">
                                <span className="od-step-label">
                                  {isRejected ? "Rejected" : "Cancelled"}{cancelledDate ? `, ${formatDate(cancelledDate)}` : ""}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          orderTimelineSteps.map((step, i) => {
                            const done = step.done;
                            const current = step.current;
                            const sub = step.sub || "";

                            return (
                              <div
                                className={`od-step ${done ? "od-step--done" : ""} ${current ? "od-step--current" : ""}`}
                                key={step.key}
                              >
                                <div className="od-step-dot-col">
                                  <span
                                    className={`od-step-dot ${done ? "od-step-dot--done" : ""}`}
                                  />
                                  {i < orderTimelineSteps.length - 1 && (
                                    <span
                                      className={`od-step-line ${done && orderTimelineSteps[i + 1]?.done ? "od-step-line--done" : ""}`}
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
                    {isCancelledOrRejected ? (
                      <>
                        <div className="od-step od-step--done">
                          <div className="od-step-dot-col">
                            <span className="od-step-dot od-step-dot--done" />
                            <span className="od-step-line od-step-line--cancelled" />
                          </div>
                          <div className="od-step-text">
                            <span className="od-step-label">
                              Order Placed{orderDate ? `, ${formatDate(orderDate)}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className="od-step od-step--done od-step--cancelled">
                          <div className="od-step-dot-col">
                            <span className="od-step-dot od-step-dot--cancelled" />
                          </div>
                          <div className="od-step-text">
                            <span className="od-step-label">
                              {isRejected ? "Rejected" : "Cancelled"}{cancelledDate ? `, ${formatDate(cancelledDate)}` : ""}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      orderTimelineSteps.map((step, i) => {
                        const done = step.done;
                        const current = step.current;
                        const sub = step.sub || "";

                        return (
                          <div
                            className={`od-step ${done ? "od-step--done" : ""} ${current ? "od-step--current" : ""}`}
                            key={step.key}
                          >
                            <div className="od-step-dot-col">
                              <span
                                className={`od-step-dot ${done ? "od-step-dot--done" : ""}`}
                              />
                              {i < orderTimelineSteps.length - 1 && (
                                <span
                                  className={`od-step-line ${done && orderTimelineSteps[i + 1]?.done ? "od-step-line--done" : ""}`}
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

              <div className="od-card">
                <div className="od-side-heading">Shipment Tracking</div>

                {!hasShipmentTrackingStarted && (
                  <div className="od-note">
                    {isCancelledOrRejected
                      ? "Shipment tracking is unavailable because this order was cancelled before shipment."
                      : "Shipment tracking will start after the order is marked as shipped."}
                  </div>
                )}

                {hasShipmentTrackingStarted && shipmentLoading && <Loader size="sm" text="Loading shipment details…" />}

                {hasShipmentTrackingStarted && !shipmentLoading && shipmentError && (
                  <div className="od-error">{shipmentError}</div>
                )}

                {hasShipmentTrackingStarted && !shipmentLoading && !shipmentError && !shipment && (
                  <div className="od-note">Shipment not created yet</div>
                )}

                {hasShipmentTrackingStarted && !shipmentLoading && !shipmentError && shipment && (
                  <>
                    <div className="od-price-row">
                      <span>Shipment Status</span>
                      <span>{shipmentStatus || "-"}</span>
                    </div>
                    <div className="od-price-row">
                      <span>Tracking Number</span>
                      <span>{shipmentTrackingNumber || "-"}</span>
                    </div>
                    <div className="od-price-row">
                      <span>Carrier Name</span>
                      <span>{shipmentCarrierName || "-"}</span>
                    </div>
                    <div className="od-price-row">
                      <span>Estimated Delivery</span>
                      <span>{shipmentEstimatedDeliveryDate ? formatDateTime(shipmentEstimatedDeliveryDate) : "-"}</span>
                    </div>
                    <div className="od-price-row">
                      <span>Delivered At</span>
                      <span>{shipmentDeliveredAt ? formatDateTime(shipmentDeliveredAt) : "-"}</span>
                    </div>
                    {shipmentTrackingUrl && (
                      <div className="od-price-row">
                        <span>Tracking Link</span>
                        <a href={shipmentTrackingUrl} target="_blank" rel="noreferrer">Open Tracking</a>
                      </div>
                    )}

                    <div className="od-timeline">
                      {SHIPMENT_STEPS.map((step, i) => {
                        const done = shipmentStepIndex >= 0 && i <= shipmentStepIndex;
                        const current = shipmentStepIndex === i;
                        return (
                          <div
                            className={`od-step ${done ? "od-step--done" : ""} ${current ? "od-step--current" : ""}`}
                            key={step}
                          >
                            <div className="od-step-dot-col">
                              <span className={`od-step-dot ${done ? "od-step-dot--done" : ""}`} />
                              {i < SHIPMENT_STEPS.length - 1 && (
                                <span className={`od-step-line ${done && shipmentStepIndex > i ? "od-step-line--done" : ""}`} />
                              )}
                            </div>
                            <div className="od-step-text">
                              <span className="od-step-label">{step}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Delivery exec note */}
              {hasShipmentTrackingStarted && !isDelivered && !isCancelledOrRejected && (
                <div className="od-card od-note">
                  Delivery Executive details will be available once the order is
                  out for delivery
                </div>
              )}

              {/* Action buttons */}
              {canCancel && (
                <div className="od-card od-actions">
                  <button
                    type="button"
                    className="od-action-btn od-action-cancel"
                    disabled={cancelling}
                    onClick={() => setShowCancelModal(true)}
                  >
                    {cancelling ? "Cancelling…" : "Cancel Order"}
                  </button>
                  <button
                    type="button"
                    className="od-action-btn od-action-chat"
                  >
                    💬 Chat with us
                  </button>
                </div>
              )}

              {/* Chat only for shipped (no cancel allowed) */}
              {!isCancelledOrRejected && !isDelivered && !canCancel && (
                <div className="od-card od-actions od-actions--single">
                  <button type="button" className="od-action-btn od-action-chat">
                    💬 Chat with us
                  </button>
                </div>
              )}

              {isCancelledOrRejected && (
                <div className="od-card od-actions od-actions--single">
                  <button
                    type="button"
                    className="od-action-btn od-action-chat"
                  >
                    💬 Chat with us
                  </button>
                </div>
              )}

              {canViewInvoice && (
                <div className="od-card od-actions od-actions--single">
                  <button
                    type="button"
                    className="od-action-btn od-action-invoice"
                    onClick={() => navigate(`/invoice/${orderId}`)}
                  >
                    View Invoice
                  </button>
                </div>
              )}

              {isDelivered && !isCancelledOrRejected && (
                <div className="od-card od-actions od-actions--single">
                  <button
                    type="button"
                    className="od-action-btn od-action-cancel"
                    onClick={handleOpenReturnForm}
                  >
                    Request Return
                  </button>
                </div>
              )}

              {showReturnForm && isDelivered && !isCancelledOrRejected && (
                <div className="od-card">
                  <div className="od-side-heading">Return Request</div>

                  <div className="od-price-row">
                    <span>Order Item</span>
                    <select
                      value={returnItemId}
                      onChange={(e) => setReturnItemId(e.target.value)}
                    >
                      {(order?.items || order?.orderItems || []).map((item, idx) => {
                        const id = String(item?.orderItemId || item?.id || "");
                        const label = item?.productName || item?.name || `Item ${idx + 1}`;
                        return (
                          <option key={`${id}-${idx}`} value={id}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="od-price-row">
                    <span>Returned Quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={returnedQuantity}
                      onChange={(e) => setReturnedQuantity(e.target.value)}
                    />
                  </div>

                  <div className="od-price-row">
                    <span>Return Condition</span>
                    <select
                      value={returnCondition}
                      onChange={(e) => setReturnCondition(e.target.value)}
                    >
                      {RETURN_CONDITIONS.map((condition) => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
                  </div>

                  <div className="od-price-row">
                    <span>Reason</span>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Why are you returning this item?"
                    />
                  </div>

                  {returnError && <div className="od-error">{returnError}</div>}

                  <div className="od-modal-actions">
                    <button
                      type="button"
                      className="od-modal-btn od-modal-btn--cancel"
                      disabled={returnSubmitting}
                      onClick={handleSubmitReturnRequest}
                    >
                      {returnSubmitting ? "Submitting…" : "Submit Return"}
                    </button>
                    <button
                      type="button"
                      className="od-modal-btn od-modal-btn--keep"
                      disabled={returnSubmitting}
                      onClick={() => {
                        setShowReturnForm(false);
                        setReturnError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {(returnTrackingLoading || returnData) && (
                <div className="od-card">
                  <div className="od-side-heading">Return Tracking</div>
                  {returnTrackingLoading && <Loader size="sm" text="Loading return status…" />}
                  {!returnTrackingLoading && returnData && (
                    <>
                      <div className="od-price-row">
                        <span>Return ID</span>
                        <span>{returnData.id || returnData.returnId || returnId || "-"}</span>
                      </div>
                      <div className="od-price-row">
                        <span>Status</span>
                        <span>{returnData.status || "REQUESTED"}</span>
                      </div>
                      <div className="od-timeline">
                        {["REQUESTED", "APPROVED", "RECEIVED", "INSPECTED", "COMPLETED"].map((step, i, arr) => {
                          const current = (returnData.status || "REQUESTED").toUpperCase();
                          const currentIdx = arr.indexOf(current) >= 0 ? arr.indexOf(current) : 0;
                          const done = i <= currentIdx;
                          return (
                            <div key={step} className={`od-step ${done ? "od-step--done" : ""} ${i === currentIdx ? "od-step--current" : ""}`}>
                              <div className="od-step-dot-col">
                                <span className={`od-step-dot ${done ? "od-step-dot--done" : ""}`} />
                                {i < arr.length - 1 && (
                                  <span className={`od-step-line ${done && i < currentIdx ? "od-step-line--done" : ""}`} />
                                )}
                              </div>
                              <div className="od-step-text">
                                <span className="od-step-label">{step}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Refund Status Card (online payments only) */}
              {isCancelledOrRejected && !isCodOrder && !refundLoading && refund && (
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

                    {/* Refresh button for non-final statuses */}
                    {!["PROCESSED", "REJECTED", "FAILED"].includes(refund.status) && (
                      <button
                        type="button"
                        className="od-refund-refresh"
                        disabled={refundRefreshing}
                        onClick={refreshRefund}
                      >
                        {refundRefreshing ? "Checking…" : "🔄 Refresh Status"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isCancelledOrRejected && !isCodOrder && refundLoading && (
                <div className="od-card od-refund-loading">
                  <Loader size="sm" text="Checking refund status…" />
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
                    const isEditing = editingReview === item.productId;
                    const submitting = reviewSubmitting[item.productId];
                    const canEdit = existing?.submitted && isEditing;
                    const displayRating = (canEdit || isOpen) && !existing?.submitted
                      ? draft.rating
                      : canEdit
                        ? draft.rating
                        : existing?.submitted
                          ? existing.rating
                          : draft.rating;

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
                            {/* Star row */}
                            <div className="od-review-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  className={`od-star-btn ${displayRating >= star ? "od-star-btn--filled" : ""} ${existing?.submitted && !isEditing ? "od-star-btn--locked" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (existing?.submitted && !isEditing) return;
                                    updateDraft(item.productId, "rating", star);
                                    if (!isEditing) setExpandedReview(item.productId);
                                  }}
                                  disabled={existing?.submitted && !isEditing}
                                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                >
                                  ★
                                </button>
                              ))}
                              {existing?.submitted && !isEditing && (
                                <span className="od-review-submitted-badge">✓ Reviewed</span>
                              )}
                            </div>
                          </div>
                          {/* Action button — Write / Edit */}
                          {!existing?.submitted && !isOpen && (
                            <button
                              type="button"
                              className="od-review-expand-btn"
                              onClick={() => setExpandedReview(item.productId)}
                            >
                              Write a review ›
                            </button>
                          )}
                          {!existing?.submitted && isOpen && (
                            <button
                              type="button"
                              className="od-review-expand-btn"
                              onClick={() => setExpandedReview(null)}
                            >
                              ▾
                            </button>
                          )}
                          {existing?.submitted && !isEditing && (
                            <button
                              type="button"
                              className="od-review-edit-btn"
                              onClick={() => handleEditReview(item.productId)}
                            >
                              ✎ Edit
                            </button>
                          )}
                          {isEditing && (
                            <button
                              type="button"
                              className="od-review-expand-btn"
                              onClick={() => handleCancelEdit(item.productId)}
                            >
                              ▾
                            </button>
                          )}
                        </div>

                        {/* Submitted review display (not in edit mode) */}
                        {existing?.submitted && !isEditing && existing?.comment && (
                          <div className="od-review-display">
                            <div className="od-review-display-text">"{existing.comment}"</div>
                          </div>
                        )}

                        {/* Expandable review form (new review or edit mode) */}
                        {isOpen && (!existing?.submitted || isEditing) && (
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
                                  onClick={() => isEditing ? handleCancelEdit(item.productId) : setExpandedReview(null)}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="od-review-submit-btn"
                                  disabled={!draft.rating || submitting}
                                  onClick={() => handleSubmitReview(item.productId)}
                                >
                                  {submitting ? "Submitting…" : isEditing ? "Update Review" : "Submit Review"}
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
                {isCancelledOrRejected && (
                  <div className="od-rate-row">
                    <span className="od-rate-icon">🔄</span>
                    <span>How was your {isRejected ? "rejection" : "cancellation"} experience?</span>
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
                <div className="od-side-heading-row">
                  <div className="od-side-heading">Delivery details</div>
                  {canChangeAddress && (
                    <button type="button" className="od-address-change-btn" onClick={handleChangeAddress}>
                      Change
                    </button>
                  )}
                </div>

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
                    {isCodOrder ? "💵" : "💳"} {isCodOrder ? "Cash on Delivery" : paymentMethod}
                  </span>
                </div>

                {isCodOrder && (
                  <div className="od-price-row">
                    <span>Payment Status</span>
                    <span className={`od-cod-status ${paymentStatus === "COLLECTED" ? "od-cod-status--collected" : "od-cod-status--pending"}`}>
                      {getPaymentStatusLabel(paymentStatus)}
                    </span>
                  </div>
                )}

                {!isCodOrder && paymentStatus && (
                  <div className="od-price-row">
                    <span>Payment Status</span>
                    <span className="od-payment-id">{getPaymentStatusLabel(paymentStatus)}</span>
                  </div>
                )}

                {!isCodOrder && paymentStatus === "REFUNDED" && (
                  <div className="od-price-row">
                    <span>Refund</span>
                    <span className="od-refund-completed-badge">Refund Completed</span>
                  </div>
                )}

                {!isCodOrder && paymentId && (
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
              {/* Order Placed */}
              <div className="od-update-item">
                <div className="od-update-dot-col">
                  <span className="od-update-dot od-update-dot--green" />
                  <span className={`od-update-line ${isCancelledOrRejected ? 'od-update-line--red' : activeStep >= 1 ? 'od-update-line--green' : ''}`} />
                </div>
                <div className="od-update-content">
                  <div className="od-update-heading">
                    <strong>Order Placed</strong>
                    <span className="od-update-date">{formatDateShort(orderDate)}</span>
                  </div>
                  <div className="od-update-desc">Your order has been placed.</div>
                  <div className="od-update-time">{formatDateTime(orderDate)}</div>
                </div>
              </div>

              {!isCancelledOrRejected && orderTimelineSteps.slice(1).map((step, index, arr) => {
                const done = step.done;
                const hasNext = index < arr.length - 1;
                return (
                  <div className="od-update-item" key={`update-${step.key}`}>
                    <div className="od-update-dot-col">
                      <span className={`od-update-dot ${done ? "od-update-dot--green" : ""}`} />
                      {hasNext && (
                        <span className={`od-update-line ${done && arr[index + 1]?.done ? "od-update-line--green" : ""}`} />
                      )}
                    </div>
                    <div className="od-update-content">
                      <div className="od-update-heading">
                        <strong>{step.label}</strong>
                      </div>
                      {step.sub && <div className="od-update-desc">{step.sub}</div>}
                    </div>
                  </div>
                );
              })}

              {/* Cancelled / Rejected */}
              {isCancelledOrRejected && (
                <div className="od-update-item">
                  <div className="od-update-dot-col">
                    <span className="od-update-dot od-update-dot--red" />
                  </div>
                  <div className="od-update-content">
                    <div className="od-update-heading">
                      <strong>{isRejected ? "Rejected by Seller" : "Cancelled"}</strong>
                      <span className="od-update-date">{formatDateShort(cancelledDate || orderDate)}</span>
                    </div>
                    <div className="od-update-desc">
                      {isRejected
                        ? (isCodOrder
                          ? "Your order was rejected by the seller."
                          : "Your order was rejected by the seller. A refund will be initiated shortly.")
                        : (isCodOrder
                          ? "Your order has been cancelled."
                          : "Your request is being processed. It may take up to 4 hours for your refund (if any) to be initiated.")}
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
                  Cancel Order
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
              {isCodOrder
                ? "Are you sure you want to cancel this order?"
                : "Are you sure you want to cancel this order? Your payment will be refunded."}
            </div>

            <div className="od-modal-body">
              <div className="od-modal-field">
                <label htmlFor="cancel-reason">Reason</label>
                <select id="cancel-reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}>
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div className="od-modal-field">
                <label htmlFor="cancel-comments">Comments</label>
                <input
                  id="cancel-comments"
                  type="text"
                  value={cancelComments}
                  onChange={(e) => setCancelComments(e.target.value)}
                  placeholder="Add optional comments"
                />
              </div>

              {!isCodOrder && (
                <div className="od-modal-field">
                  <label htmlFor="cancel-refund-mode">Refund Mode</label>
                  <select id="cancel-refund-mode" value={cancelRefundMode} onChange={(e) => setCancelRefundMode(e.target.value)}>
                    {REFUND_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="od-modal-actions">
              <button
                type="button"
                className="od-modal-btn od-modal-btn--keep"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="od-modal-btn od-modal-btn--cancel"
                disabled={cancelling}
                onClick={handleCancelOrder}
              >
                {cancelling ? "Cancelling…" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
