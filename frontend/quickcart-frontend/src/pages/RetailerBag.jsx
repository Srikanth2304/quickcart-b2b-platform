import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getBagItems,
  removeFromBag,
  updateBagItemQuantity,
} from "../utils/bagStorage";
import { showToast } from "../utils/notify";
import Loader from "../components/Loader";
import api from "../api/axios";
import "./RetailerBag.css";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString();
}

function getStoredWishlist() {
  try {
    const raw = localStorage.getItem("retailer-wishlist");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveWishlist(items) {
  try {
    localStorage.setItem("retailer-wishlist", JSON.stringify(items));
  } catch (error) {
    // ignore
  }
}

function unwrapApiData(responseData) {
  if (!responseData || typeof responseData !== "object") return responseData;
  if (responseData.data !== undefined) return responseData.data;
  return responseData;
}

function idsEqual(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  return String(a) === String(b);
}

const EMPTY_ADDRESS_FORM = {
  name: "",
  phone: "",
  alternatePhone: "",
  addressType: "HOME",
  locality: "",
  landmark: "",
  addressLine1: "",
  city: "",
  state: "",
  pincode: "",
};

export default function RetailerBag() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => getBagItems());
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [address, setAddress] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [addressPanelOpen, setAddressPanelOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [addressList, setAddressList] = useState(() => []);
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    try {
      const saved = sessionStorage.getItem("checkout-selected-address-id");
      return saved || null;
    } catch (error) {
      return null;
    }
  });
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);

  useEffect(() => {
    const refresh = () => setItems(getBagItems());
    window.addEventListener("retailer-bag-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("retailer-bag-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const refreshAddresses = async (preferredAddressId = null) => {
    setAddressLoading(true);
    setAddressError("");
    try {
      const response = await api.get("/addresses");
      const payload = unwrapApiData(response.data);
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.content)
        ? payload.content
        : [];
      setAddressList(list);
      if (list.length === 0) {
        setAddressFormOpen(true);
        setSelectedAddressId(null);
        setAddress(null);
        return [];
      }

      const nextSelectedId =
        preferredAddressId !== null && preferredAddressId !== undefined
          ? preferredAddressId
          : selectedAddressId;
      const selected = list.find((item) => idsEqual(item?.id, nextSelectedId));
      const resolvedAddress = selected || list.find((item) => item?.isDefault) || list[0] || null;

      setSelectedAddressId(resolvedAddress?.id || null);
      setAddress(resolvedAddress || null);
      return list;
    } catch (error) {
      setAddressError("Failed to load addresses.");
      return [];
    } finally {
      setAddressLoading(false);
    }
  };

  useEffect(() => {
    try {
      if (selectedAddressId === null || selectedAddressId === undefined) {
        sessionStorage.removeItem("checkout-selected-address-id");
      } else {
        sessionStorage.setItem("checkout-selected-address-id", String(selectedAddressId));
      }
    } catch (error) {
      // Ignore session storage errors
    }
  }, [selectedAddressId]);

  useEffect(() => {
    if (!addressPanelOpen) return;
    refreshAddresses();
  }, [addressPanelOpen]);

  useEffect(() => {
    refreshAddresses();
  }, []);

  const handleOpenAddressPanel = () => setAddressPanelOpen(true);
  const handleCloseAddressPanel = () => {
    setAddressPanelOpen(false);
    setAddressFormOpen(false);
    setEditingAddressId(null);
  };
  const handleOpenAddressForm = () => setAddressFormOpen(true);
  const handleCloseAddressForm = () => {
    setAddressFormOpen(false);
    setEditingAddressId(null);
  };

  const resetAddressForm = () => {
    setAddressForm(EMPTY_ADDRESS_FORM);
  };

  const handleDeliverHere = () => {
    if (!selectedAddressId) return;
    const selected = addressList.find((item) => idsEqual(item.id, selectedAddressId));
    if (!selected) return;
    setAddress(selected);
    setAddressPanelOpen(false);
  };

  const handleAddressInput = (key, value) => {
    setAddressForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveAddress = async () => {
    try {
      setAddressError("");
      let targetAddressId = null;

      if (editingAddressId) {
        const original = addressList.find((item) => item.id === editingAddressId);
        if (!original) return;
        const pick = (value, fallback) => (value !== "" && value !== undefined && value !== null ? value : fallback || "");
        const payload = {
          name: pick(addressForm.name, original.name),
          phone: pick(addressForm.phone, original.phone),
          alternatePhone: pick(addressForm.alternatePhone, original.alternatePhone),
          addressType: pick(addressForm.addressType, original.addressType),
          locality: pick(addressForm.locality, original.locality),
          landmark: pick(addressForm.landmark, original.landmark),
          addressLine1: pick(addressForm.addressLine1, original.addressLine1),
          city: pick(addressForm.city, original.city),
          state: pick(addressForm.state, original.state),
          pincode: pick(addressForm.pincode, original.pincode),
        };
        await api.patch(`/addresses/${editingAddressId}`, payload);
        targetAddressId = editingAddressId;
        showToast("Address updated", "success");
      } else {
        const payload = {
          name: addressForm.name,
          phone: addressForm.phone,
          alternatePhone: addressForm.alternatePhone,
          addressType: addressForm.addressType,
          locality: addressForm.locality,
          landmark: addressForm.landmark,
          addressLine1: addressForm.addressLine1,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          isDefault: addressList.length === 0,
        };
        const createResponse = await api.post("/addresses", payload);
        const createdAddress = unwrapApiData(createResponse?.data) || {};
        targetAddressId = createdAddress?.id ?? createdAddress?.addressId ?? null;

        if (targetAddressId) {
          setAddressList((prev) => {
            if (prev.some((item) => item?.id === targetAddressId)) return prev;
            return [createdAddress, ...prev];
          });
        }

        showToast("Address saved", "success");
      }

      await refreshAddresses(targetAddressId);

      setAddressPanelOpen(false);
      setAddressFormOpen(false);
      setEditingAddressId(null);
      resetAddressForm();
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to save address";
      setAddressError(message);
      showToast(message, "error");
    }
  };

  const handleMakeDefault = async (id) => {
    try {
      await api.put(`/addresses/${id}/default`);
      showToast("Default address updated", "success");
      await refreshAddresses();
    } catch (error) {
      showToast("Failed to set default", "error");
    }
  };

  const handleEditAddress = (item) => {
    setEditingAddressId(item.id);
    setAddressForm({
      name: item.name || "",
      phone: item.phone || "",
      alternatePhone: item.alternatePhone || "",
      addressType: item.addressType || "HOME",
      locality: item.locality || "",
      landmark: item.landmark || "",
      addressLine1: item.addressLine1 || "",
      city: item.city || "",
      state: item.state || "",
      pincode: item.pincode || "",
    });
    setAddressFormOpen(true);
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`/addresses/${id}`);
      showToast("Address deleted", "success");
      await refreshAddresses();
    } catch (error) {
      showToast("Failed to delete address", "error");
    }
  };

  useEffect(() => {
    setSelectedIds((prev) => {
      if (items.length === 0) return new Set();
      const next = new Set();
      items.forEach((item) => {
        if (item?.id && prev.has(item.id)) next.add(item.id);
      });
      return next;
    });
  }, [items]);

  const selectedItems = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return items.filter((item) => item?.id && selectedIds.has(item.id));
  }, [items, selectedIds]);

  const summary = useMemo(() => {
    const source = selectedItems.length > 0 ? selectedItems : [];
    const totals = source.reduce(
      (acc, item) => {
        const price = Number(item?.price ?? item?.sellingPrice ?? item?.salePrice);
        const mrp = Number(item?.mrp ?? item?.originalPrice ?? item?.listPrice ?? item?.price);
        const qty = Number(item?.quantity || 1);
        const safePrice = Number.isFinite(price) ? price : 0;
        const safeMrp = Number.isFinite(mrp) ? mrp : safePrice;
        acc.totalItems += qty;
        acc.totalMrp += safeMrp * qty;
        acc.totalPrice += safePrice * qty;
        return acc;
      },
      { totalItems: 0, totalMrp: 0, totalPrice: 0 }
    );

    return {
      ...totals,
      discount: Math.max(0, totals.totalMrp - totals.totalPrice),
    };
  }, [selectedItems]);

  const handleQuantity = (id, nextQty) => {
    updateBagItemQuantity(id, nextQty);
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const selectedCount = selectedIds.size;

  const toggleSelectAll = () => {
    setSelectedIds(() => {
      if (allSelected) return new Set();
      return new Set(items.map((item) => item?.id).filter(Boolean));
    });
  };

  const toggleSelectItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) {
      showToast("Select an item first", "info");
      return;
    }
    Array.from(selectedIds).forEach((id) => removeFromBag(id));
  };

  const handleMoveSelectedToWishlist = () => {
    if (selectedIds.size === 0) {
      showToast("Select an item first", "info");
      return;
    }
    const wishlist = getStoredWishlist();
    const existingIds = new Set(wishlist.map((item) => item?.id).filter(Boolean));
    const toAdd = items.filter((item) => item?.id && selectedIds.has(item.id));
    const merged = [...wishlist, ...toAdd.filter((item) => !existingIds.has(item.id))];
    saveWishlist(merged);
    Array.from(selectedIds).forEach((id) => removeFromBag(id));
  };

  const isSummaryStep = checkoutStep === "summary";
  const hasValidSelectedAddress = Boolean(
    selectedAddressId && addressList.some((item) => idsEqual(item?.id, selectedAddressId))
  );

  const fetchRazorpayKey = async () => {
    const response = await api.get("/payments/razorpay/key");
    const payload = unwrapApiData(response?.data) || {};
    return payload?.keyId || "";
  };

  const buildCancelPayload = (reason, comments = "") => ({
    reason,
    comments: comments || "",
    refundMode: "ORIGINAL",
  });

  const cancelOrderWithPayload = async (orderId, reason, comments = "") => {
    await api.post(`/orders/${orderId}/cancel`, buildCancelPayload(reason, comments));
  };

  const handlePaymentStepClick = () => {
    if (!isSummaryStep) {
      if (selectedIds.size === 0) {
        showToast("Select an item first", "info");
        return;
      }
      setCheckoutStep("summary");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    handlePlaceOrder();
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showToast("Select a delivery address", "info");
      return;
    }
    if (selectedItems.length === 0) {
      showToast("Select an item first", "info");
      return;
    }

    const payload = {
      deliveryAddressId: selectedAddressId,
      items: selectedItems.map((item) => ({
        productId: item.id,
        quantity: Number(item.quantity || 1),
      })),
      paymentMethod,
    };

    setPlacingOrder(true);
    let orderId = null;
    try {
      const orderResponse = await api.post("/orders", payload);
      const orderPayload = unwrapApiData(orderResponse?.data) || {};
      orderId = orderPayload?.orderId;
      if (!orderId) {
        showToast("Failed to create order", "error");
        setPlacingOrder(false);
        return;
      }

      // ── COD: skip Razorpay entirely ──
      if (paymentMethod === "CASH_ON_DELIVERY") {
        try {
          const purchasedIds = selectedItems.map((item) => item.id);
          purchasedIds.forEach((id) => removeFromBag(id));
          setItems(getBagItems());
          setSelectedIds(new Set());
        } catch { /* ignore cleanup errors */ }
        showToast("Order placed with Cash on Delivery!", "success");
        setPlacingOrder(false);
        navigate(`/orders/success?orderId=${orderId}`);
        return;
      }

      // ── ONLINE: proceed with Razorpay ──
      const razorpayResponse = await api.post("/payments/razorpay/order", { orderId });
      const razorpayPayload = unwrapApiData(razorpayResponse?.data) || {};
      const razorpayOrderId = razorpayPayload?.razorpayOrderId;
      const amount = Number(razorpayPayload?.amount);
      const currency = razorpayPayload?.currency || "INR";

      if (!razorpayOrderId || !Number.isFinite(amount) || amount <= 0) {
        showToast("Failed to initiate payment", "error");
        try {
          await cancelOrderWithPayload(orderId, "Payment initialization failed", "Razorpay order response missing required fields");
        } catch (cancelErr) {
          showToast(cancelErr?.response?.data?.message || "Failed to cancel order after payment initiation failure", "error");
        }
        setPlacingOrder(false);
        return;
      }

      const loadRazorpaySdk = () => {
        return new Promise((resolve) => {
          if (window?.Razorpay) return resolve(true);
          const existing = document.getElementById("razorpay-sdk");
          if (existing) {
            existing.addEventListener("load", () => resolve(true));
            existing.addEventListener("error", () => resolve(false));
            return;
          }
          const script = document.createElement("script");
          script.id = "razorpay-sdk";
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const sdkLoaded = await loadRazorpaySdk();
      if (!sdkLoaded || !window?.Razorpay) {
        showToast("Razorpay SDK not loaded", "error");
        try {
          await cancelOrderWithPayload(orderId, "Payment SDK unavailable", "Razorpay checkout script failed to load");
        } catch (cancelErr) {
          showToast(cancelErr?.response?.data?.message || "Failed to cancel order after SDK error", "error");
        }
        setPlacingOrder(false);
        return;
      }

      const keyId = await fetchRazorpayKey();
      if (!keyId) {
        showToast("Razorpay key is missing", "error");
        try {
          await cancelOrderWithPayload(orderId, "Payment key missing", "Razorpay keyId was not returned by API");
        } catch (cancelErr) {
          showToast(cancelErr?.response?.data?.message || "Failed to cancel order after key fetch error", "error");
        }
        setPlacingOrder(false);
        return;
      }

      // Persist order context for recovery if verify call fails
      try {
        sessionStorage.setItem(`pending-order`, JSON.stringify({ orderId, razorpayOrderId }));
      } catch { /* ignore */ }

      const purchasedIds = selectedItems.map((item) => item.id);

      const options = {
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post("/payments/razorpay/verify", {
              orderId,
              razorpayPaymentId: response?.razorpay_payment_id,
              razorpayOrderId: response?.razorpay_order_id,
              razorpaySignature: response?.razorpay_signature,
            });
            showToast("Payment successful", "success");
            // Clear purchased items from bag
            purchasedIds.forEach((id) => removeFromBag(id));
            setItems(getBagItems());
            setSelectedIds(new Set());
            try {
              sessionStorage.setItem(
                `order-payment-${orderId}`,
                response?.razorpay_payment_id || ""
              );
              sessionStorage.removeItem(`pending-order`);
            } catch { /* ignore */ }
            navigate(`/orders/success?orderId=${orderId}`);
          } catch (verifyError) {
            try {
              await cancelOrderWithPayload(orderId, "Payment verification failed", verifyError?.response?.data?.message || "Verification callback failed");
            } catch (cancelErr) {
              showToast(cancelErr?.response?.data?.message || "Failed to cancel order after payment verification failure", "error");
            }
            if (!navigator.onLine || verifyError?.code === "ERR_NETWORK") {
              showToast("Network error during payment verification. Please contact support.", "error");
            } else {
              showToast("Payment verification failed. Please contact support if amount was deducted.", "error");
            }
          } finally {
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: async () => {
            // User closed Razorpay without paying → cancel the unpaid order
            try {
              await cancelOrderWithPayload(orderId, "Payment cancelled by user", "Razorpay checkout modal dismissed");
            } catch (cancelErr) {
              showToast(cancelErr?.response?.data?.message || "Failed to cancel order after payment dismissal", "error");
            }
            try {
              sessionStorage.removeItem(`pending-order`);
            } catch { /* ignore */ }
            showToast("Payment was not completed. Order has been cancelled.", "info");
            setPlacingOrder(false);
          },
        },
        theme: {
          color: "#2563eb",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      // NOTE: placingOrder will be reset inside handler/ondismiss, NOT in finally
    } catch (error) {
      // If order was created but something else failed, cancel it
      if (orderId) {
        try {
          await cancelOrderWithPayload(orderId, "Checkout failed", error?.response?.data?.message || "Unexpected checkout exception");
        } catch (cancelErr) {
          showToast(cancelErr?.response?.data?.message || "Failed to cancel order after checkout failure", "error");
        }
      }
      if (!navigator.onLine || error?.code === "ERR_NETWORK" || error?.message === "Network Error") {
        showToast("No internet connection. Please check your network and try again.", "error");
      } else if (error?.response?.status === 401 || error?.response?.status === 403) {
        showToast("Session expired. Please log in again.", "error");
      } else if (error?.response?.status === 409) {
        showToast("Some items are out of stock. Please update your cart.", "error");
      } else if (error?.response?.status >= 500) {
        showToast("Server error. Please try again in a moment.", "error");
      } else if (error?.response?.data?.message) {
        showToast(error.response.data.message, "error");
      } else {
        showToast("Failed to place order. Please try again.", "error");
      }
      setPlacingOrder(false);
    }
  };

  return (
    <div className="retailer-bag-page">
      <div className="retailer-bag-steps">
        <button
          type="button"
          className={`bag-step ${!isSummaryStep ? "active" : ""}`}
          onClick={() => setCheckoutStep("cart")}
        >
          CART
        </button>
        <span className="divider"></span>
        <button
          type="button"
          className={`bag-step ${isSummaryStep ? "active" : ""}`}
          onClick={() => setCheckoutStep("summary")}
        >
          ADDRESS
        </button>
        <span className="divider"></span>
        <button type="button" className="bag-step" onClick={handlePaymentStepClick}>
          PAYMENT
        </button>
      </div>

      <div className="retailer-bag-layout">
        <section className="retailer-bag-left">
          {address ? (
            <div className="bag-delivery">
              <div>
                <div className="bag-delivery-title">Deliver to:</div>
                <div className="bag-delivery-meta">
                  {address.name || "Customer"}, {address.pincode || ""}
                </div>
                <div className="bag-delivery-sub">
                  {address.addressLine1 || address.line1 || ""}
                  {address.locality ? `, ${address.locality}` : address.line2 ? `, ${address.line2}` : ""}
                  {address.city ? `, ${address.city}` : ""}
                  {address.state ? `, ${address.state}` : ""}
                </div>
              </div>
              <button type="button" className="bag-outline" onClick={handleOpenAddressPanel}>
                CHANGE ADDRESS
              </button>
            </div>
          ) : (
            <div className="bag-delivery bag-delivery-empty">
              <div className="bag-delivery-meta">Check delivery time & services</div>
              <button type="button" className="bag-outline" onClick={handleOpenAddressPanel}>
                ENTER PIN CODE
              </button>
            </div>
          )}

          {!isSummaryStep && (
            <>
              <div className="bag-offers">
                <div className="bag-offers-title">Available Offers</div>
                <div className="bag-offer-item">
                  7.5% Assured Cashback* on a minimum spend of ₹100. T&C
                </div>
                <button type="button" className="bag-link">Show More</button>
              </div>

              <div className="bag-items-header">
                <div>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  <span className="bag-items-title">
                    {selectedCount > 0 ? selectedCount : summary.totalItems} ITEMS SELECTED
                  </span>
                </div>
                <div className="bag-items-actions">
                  <button type="button" className="bag-link" onClick={handleRemoveSelected}>
                    REMOVE
                  </button>
                  <button type="button" className="bag-link" onClick={handleMoveSelectedToWishlist}>
                    MOVE TO FAVORITES
                  </button>
                </div>
              </div>
            </>
          )}

          {isSummaryStep && items.length > 0 && (
            <div className="bag-summary-title">ORDER SUMMARY</div>
          )}

          {items.length === 0 ? (
            <div className="bag-empty">Your cart is empty.</div>
          ) : (
            <div className="bag-items">
              {(isSummaryStep ? selectedItems : items).map((item) => {
                const price = item?.price ?? item?.sellingPrice ?? item?.salePrice ?? 0;
                const mrp = item?.mrp ?? item?.originalPrice ?? item?.listPrice ?? item?.price;
                const stockValue = Number(item?.stock);
                const hasStockValue = Number.isFinite(stockValue) && stockValue >= 0;
                const stockTone = hasStockValue && stockValue > 10 ? "high" : "low";
                const stockLabel = hasStockValue
                  ? stockValue === 0
                    ? "Out of stock"
                    : stockValue > 10
                    ? `In stock: ${stockValue}`
                    : `Only ${stockValue} left`
                  : "";
                const discountPercent =
                  mrp && Number(mrp) > Number(price)
                    ? Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100)
                    : null;
                return (
                  <div key={item.id} className={`bag-item ${isSummaryStep ? "summary" : ""}`}>
                    {!isSummaryStep && (
                      <div className="bag-item-select">
                        <input
                          type="checkbox"
                          className="bag-item-checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectItem(item.id)}
                        />
                      </div>
                    )}
                    <a
                      className="bag-item-link"
                      href={`/retailer/products/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        try {
                          sessionStorage.setItem(
                            `retailer-product-${item.id}`,
                            JSON.stringify(item)
                          );
                        } catch (storageError) {
                          // ignore
                        }
                      }}
                    >
                      <div className="bag-item-image">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name || "Product"} />
                        ) : (
                          <div className="bag-item-placeholder">
                            <span>{item.name?.charAt(0) || "P"}</span>
                          </div>
                        )}
                      </div>
                    </a>
                    <div className="bag-item-info">
                      <a
                        className="bag-item-title-link"
                        href={`/retailer/products/${item.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          try {
                            sessionStorage.setItem(
                              `retailer-product-${item.id}`,
                              JSON.stringify(item)
                            );
                          } catch (storageError) {
                            // ignore
                          }
                        }}
                      >
                        <div className="bag-item-title">{item.name}</div>
                      </a>
                      <div className="bag-item-meta">{item.brand || "Brand"}</div>
                      <div className="bag-item-soldby">
                        Supplier: {item.manufacturerName || item.manufacturer?.name || item.manufacturer || "Manufacturer"}
                      </div>
                      <div className="bag-item-row">
                        <span className="bag-item-label">Qty:</span>
                        <select
                          value={item.quantity || 1}
                          onChange={(event) => handleQuantity(item.id, event.target.value)}
                        >
                          {[1, 2, 3, 4, 5].map((qty) => (
                            <option key={qty} value={qty}>
                              {qty}
                            </option>
                          ))}
                        </select>
                        {hasStockValue && (
                          <span className={`bag-item-stock bag-item-stock-${stockTone}`}>
                            {stockLabel}
                          </span>
                        )}
                      </div>
                      <div className="bag-item-price">
                        <span className="bag-item-price-current">₹{formatCurrency(price)}</span>
                        {mrp && (
                          <span className="bag-item-price-mrp">₹{formatCurrency(mrp)}</span>
                        )}
                        {Number.isFinite(discountPercent) && (
                          <span className="bag-item-price-discount">({discountPercent}% OFF)</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="retailer-bag-right">
          {!isSummaryStep && (
            <>
              <div className="bag-panel">
                <div className="bag-panel-title">Coupons</div>
                <div className="bag-panel-row">
                  <span>Apply Coupons</span>
                  <button type="button" className="bag-outline">APPLY</button>
                </div>
              </div>

              <div className="bag-panel">
                <div className="bag-panel-title">Gifting & Personalisation</div>
                <div className="bag-gift">
                  <div>
                    <div className="bag-gift-title">Buying for a loved one?</div>
                    <div className="bag-gift-sub">Gift packaging and personalised message on card.</div>
                    <button type="button" className="bag-link">ADD GIFT PACKAGE</button>
                  </div>
                  <div className="bag-gift-icon">🎁</div>
                </div>
              </div>

              <div className="bag-panel">
                <div className="bag-panel-title">Support transformative social work in India</div>
                <label className="bag-donate">
                  <input type="checkbox" /> Donate and make a difference
                </label>
                <div className="bag-donate-options">
                  {[10, 20, 50, 100].map((amount) => (
                    <button key={amount} type="button" className="bag-pill">₹{amount}</button>
                  ))}
                </div>
                <button type="button" className="bag-link">Know More</button>
              </div>
            </>
          )}

          {isSummaryStep && (
            <div className="bag-panel bag-payment-panel">
              <div className="bag-panel-title">Payment Method</div>
              <div className="bag-payment-options">
                <label className={`bag-payment-option ${paymentMethod === "ONLINE" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ONLINE"
                    checked={paymentMethod === "ONLINE"}
                    onChange={() => setPaymentMethod("ONLINE")}
                  />
                  <div className="bag-payment-option-content">
                    <span className="bag-payment-option-icon">💳</span>
                    <div className="bag-payment-option-text">
                      <span className="bag-payment-option-title">Online Payment</span>
                      <span className="bag-payment-option-desc">Pay securely via UPI, Cards, Net Banking</span>
                    </div>
                  </div>
                </label>
                <label className={`bag-payment-option ${paymentMethod === "CASH_ON_DELIVERY" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH_ON_DELIVERY"
                    checked={paymentMethod === "CASH_ON_DELIVERY"}
                    onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                  />
                  <div className="bag-payment-option-content">
                    <span className="bag-payment-option-icon">💵</span>
                    <div className="bag-payment-option-text">
                      <span className="bag-payment-option-title">Cash on Delivery</span>
                      <span className="bag-payment-option-desc">Pay when your order is delivered</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className="bag-panel">
            <div className="bag-panel-title">Price Details ({summary.totalItems} items)</div>
            <div className="bag-price-row">
              <span>Total MRP</span>
              <span>₹{formatCurrency(summary.totalMrp)}</span>
            </div>
            <div className="bag-price-row discount">
              <span>Discount on MRP</span>
              <span>- ₹{formatCurrency(summary.discount)}</span>
            </div>
            <div className="bag-price-row">
              <span>Platform Fee</span>
              <span>₹{formatCurrency(summary.totalItems * 10)}</span>
            </div>
            <div className="bag-total-row">
              <span>Total Amount</span>
              <span>₹{formatCurrency(summary.totalPrice + summary.totalItems * 10)}</span>
            </div>
            <button
              type="button"
              className="bag-primary"
              disabled={placingOrder || (isSummaryStep && !hasValidSelectedAddress)}
              onClick={() => {
                if (!isSummaryStep) {
                  if (selectedIds.size === 0) {
                    showToast("Select an item first", "info");
                    return;
                  }
                  setCheckoutStep("summary");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                handlePlaceOrder();
              }}
            >
              {placingOrder ? (
                <span className="qc-btn-spinner"><span className="qc-spinner" /> Placing Order…</span>
              ) : isSummaryStep ? (paymentMethod === "CASH_ON_DELIVERY" ? "PLACE COD ORDER" : "CONTINUE") : "PLACE ORDER"}
            </button>
          </div>
        </aside>
      </div>

      {addressPanelOpen && (
        <div className="address-panel-overlay" onClick={handleCloseAddressPanel}>
          <div className="address-panel" onClick={(event) => event.stopPropagation()}>
            <div className="address-panel-header">
              <span>DELIVERY ADDRESS</span>
              <button type="button" onClick={handleCloseAddressPanel}>×</button>
            </div>
            {!addressFormOpen ? (
              <>
                <div className="address-panel-list">
                  {addressLoading && <div className="address-empty"><Loader size="sm" text="Loading addresses…" /></div>}
                  {!addressLoading && addressError && (
                    <div className="address-empty">{addressError}</div>
                  )}
                  {!addressLoading && !addressError && addressList.length === 0 && (
                    <div className="address-empty">No saved addresses yet.</div>
                  )}
                  {!addressLoading && !addressError && addressList.length > 0 &&
                    addressList.map((item) => (
                      <label
                        key={item.id}
                        className={`address-card ${idsEqual(selectedAddressId, item.id) ? "active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={idsEqual(selectedAddressId, item.id)}
                          onChange={() => {
                            setSelectedAddressId(item.id);
                            setAddress(item);
                          }}
                        />
                        <div className="address-card-body">
                          <div className="address-card-row">
                            <span className="address-name">
                              {item.name}
                              {item.isDefault && <span className="address-default-text">(Default)</span>}
                            </span>
                            <span className="address-tag">{item.addressType || "HOME"}</span>
                            <span className="address-phone">{item.phone}</span>
                          </div>
                          <div className="address-lines">
                            {item.addressLine1}
                            {item.locality ? `, ${item.locality}` : ""}
                            {item.city ? `, ${item.city}` : ""}
                            {item.state ? `, ${item.state}` : ""}
                            {item.pincode ? ` - ${item.pincode}` : ""}
                            {item.landmark ? `, ${item.landmark}` : ""}
                          </div>
                          {idsEqual(selectedAddressId, item.id) && (
                            <div className="address-card-actions">
                              <button type="button" className="address-primary" onClick={handleDeliverHere}>
                                DELIVER HERE
                              </button>
                              <button type="button" className="address-secondary" onClick={() => handleMakeDefault(item.id)}>
                                Make it default
                              </button>
                            </div>
                          )}
                        </div>
                        <button type="button" className="address-edit" onClick={() => handleEditAddress(item)}>
                          EDIT
                        </button>
                      <button type="button" className="address-delete" aria-label="Delete address" onClick={() => handleDeleteAddress(item.id)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M4 7h16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                            <path
                              d="M9 4h6l1 2H8l1-2Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M6.5 7.5 7.5 20h9l1-12.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </label>
                    ))}
                </div>

                <div className="address-panel-footer">
                  <button type="button" className="address-link">View all addresses</button>
                  <button type="button" className="address-link" onClick={handleOpenAddressForm}>
                    Add a new address
                  </button>
                </div>
              </>
            ) : (
              <div className="address-form">
                <div className="address-form-title">ADD A NEW ADDRESS</div>
                <button type="button" className="address-form-location">Use my current location</button>
                <div className="address-form-grid">
                  <input
                    placeholder="Name"
                    value={addressForm.name}
                    onChange={(e) => handleAddressInput("name", e.target.value)}
                  />
                  <input
                    placeholder="10-digit mobile number"
                    value={addressForm.phone}
                    onChange={(e) => handleAddressInput("phone", e.target.value)}
                  />
                  <input
                    placeholder="Pincode"
                    value={addressForm.pincode}
                    onChange={(e) => handleAddressInput("pincode", e.target.value)}
                  />
                  <input
                    placeholder="Locality"
                    value={addressForm.locality}
                    onChange={(e) => handleAddressInput("locality", e.target.value)}
                  />
                  <textarea
                    placeholder="Address (Area and Street)"
                    value={addressForm.addressLine1}
                    onChange={(e) => handleAddressInput("addressLine1", e.target.value)}
                  />
                  <input
                    placeholder="City/District/Town"
                    value={addressForm.city}
                    onChange={(e) => handleAddressInput("city", e.target.value)}
                  />
                  <select
                    value={addressForm.state}
                    onChange={(e) => handleAddressInput("state", e.target.value)}
                  >
                    <option value="" disabled>
                      --Select State--
                    </option>
                    <option>Andhra Pradesh</option>
                    <option>Telangana</option>
                    <option>Tamil Nadu</option>
                  </select>
                  <input
                    placeholder="Landmark (Optional)"
                    value={addressForm.landmark}
                    onChange={(e) => handleAddressInput("landmark", e.target.value)}
                  />
                  <input
                    placeholder="Alternate Phone (Optional)"
                    value={addressForm.alternatePhone}
                    onChange={(e) => handleAddressInput("alternatePhone", e.target.value)}
                  />
                </div>
                <div className="address-form-type">
                  <span>Address Type</span>
                  <label>
                    <input
                      type="radio"
                      name="addr-type"
                      checked={addressForm.addressType === "HOME"}
                      onChange={() => handleAddressInput("addressType", "HOME")}
                    />
                    Home (All day delivery)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="addr-type"
                      checked={addressForm.addressType === "OFFICE"}
                      onChange={() => handleAddressInput("addressType", "OFFICE")}
                    />
                    Office (Delivery between 10 AM - 5 PM)
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="addr-type"
                      checked={addressForm.addressType === "OTHER"}
                      onChange={() => handleAddressInput("addressType", "OTHER")}
                    />
                    Other
                  </label>
                </div>
                <div className="address-form-actions">
                  <button type="button" className="address-primary" onClick={handleSaveAddress}>
                    SAVE AND DELIVER HERE
                  </button>
                  <button type="button" className="address-link" onClick={handleCloseAddressForm}>
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
