import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Loader from "../components/Loader";
import "./InvoicePage.css";

const invoiceCache = new Map();

function unwrapApiData(responseData) {
  if (!responseData || typeof responseData !== "object") return responseData;
  if (responseData.data !== undefined) return responseData.data;
  return responseData;
}

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function renderAddress(addr) {
  if (!addr) return "-";
  if (typeof addr === "string") return addr;
  return [
    addr.addressLine1 || addr.line1 || addr.street,
    addr.addressLine2 || addr.line2,
    addr.locality,
    addr.city,
    addr.state,
    addr.pincode || addr.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export default function InvoicePage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const cached = invoiceCache.get(orderId);
    if (cached) {
      setInvoice(cached);
      setLoading(false);
      setError("");
      return;
    }

    let isMounted = true;

    const fetchInvoice = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/api/invoices/order/${orderId}`);
        const payload = unwrapApiData(response?.data) || null;
        if (!isMounted) return;
        if (!payload) {
          setInvoice(null);
          setError("Invoice not available yet.");
          return;
        }
        invoiceCache.set(orderId, payload);
        setInvoice(payload);
      } catch (err) {
        if (!isMounted) return;
        if (err?.response?.status === 404) {
          setInvoice(null);
          setError("Invoice not available yet.");
        } else {
          setInvoice(null);
          setError("Unable to load invoice.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInvoice();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const invoiceId = invoice?.id || invoice?.invoiceId || "";

  const company = useMemo(
    () => ({
      logoUrl: invoice?.company?.logoUrl || "",
      name: invoice?.company?.name || "QuickCart B2B",
      address:
        invoice?.company?.address ||
        "B2B Trade Park, Bengaluru, Karnataka",
    }),
    [invoice]
  );

  const invoiceDetails = {
    invoiceNumber: invoice?.invoiceNumber || invoiceId || "-",
    invoiceDate: formatDate(invoice?.invoiceDate || invoice?.createdAt),
    orderId: invoice?.orderId || orderId,
    paymentMethod: invoice?.paymentMethod || "-",
    transactionId:
      invoice?.transactionId ||
      invoice?.paymentDetails?.transactionId ||
      invoice?.paymentId ||
      invoice?.razorpayPaymentId ||
      "-",
  };
  const isCancelledOrder = String(invoice?.orderStatus || invoice?.status || "")
    .toUpperCase()
    .includes("CANCEL");

  const billing = {
    name: firstDefined(invoice?.billingDetails?.name, invoice?.billingName, invoice?.customer?.name, "-"),
    phone: firstDefined(invoice?.billingDetails?.phone, invoice?.billingPhone, invoice?.customer?.phone, "-"),
    address: renderAddress(firstDefined(invoice?.billingDetails, invoice?.billingAddress, invoice?.address?.billing, null)),
  };

  const shipping = {
    name: firstDefined(invoice?.shippingDetails?.name, invoice?.shippingName, invoice?.recipient?.name, "-"),
    address: renderAddress(firstDefined(invoice?.shippingDetails, invoice?.shippingAddress, invoice?.address?.shipping, null)),
  };

  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  const summary = invoice?.pricingSummary || invoice?.summary || invoice?.totals || {};
  const pricing = {
    subtotal: firstDefined(summary?.subtotal, summary?.subTotal, summary?.subtotalAmount, invoice?.subtotal, invoice?.subTotal, invoice?.subtotalAmount),
    discount: firstDefined(summary?.discount, summary?.discountAmount, summary?.totalDiscount, invoice?.discount, invoice?.discountAmount, invoice?.totalDiscount),
    tax: firstDefined(summary?.tax, summary?.taxAmount, summary?.totalTax, invoice?.tax, invoice?.taxAmount, invoice?.totalTax),
    shipping: firstDefined(summary?.shipping, summary?.shippingAmount, summary?.shippingFee, summary?.deliveryFee, invoice?.shipping, invoice?.shippingAmount, invoice?.shippingFee, invoice?.deliveryFee),
    grandTotal: firstDefined(summary?.grandTotal, summary?.grandTotalAmount, summary?.total, summary?.totalAmount, invoice?.grandTotal, invoice?.grandTotalAmount, invoice?.total, invoice?.totalAmount),
  };

  const handleDownloadPdf = async () => {
    if (!invoiceId) return;
    setDownloading(true);
    try {
      const response = await api.get(`/api/invoices/${invoiceId}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `invoice-${invoiceDetails.invoiceNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Unable to load invoice.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-topbar no-print">
        <button type="button" className="inv-btn inv-btn-secondary" onClick={() => navigate(-1)}>
          Back
        </button>
        <div className="inv-topbar-actions">
          <button type="button" className="inv-btn inv-btn-secondary" onClick={() => window.print()}>
            Print Invoice
          </button>
          <button type="button" className="inv-btn inv-btn-primary" onClick={handleDownloadPdf} disabled={!invoiceId || downloading}>
            {downloading ? "Downloading..." : "Download Invoice PDF"}
          </button>
        </div>
      </div>

      {loading && <div className="inv-state"><Loader text="Loading invoice..." /></div>}
      {!loading && error && <div className="inv-state inv-error">{error}</div>}

      {!loading && !error && invoice && (
        <section className="inv-card" aria-label="Invoice">
          <header className="inv-header">
            <div className="inv-company">
              {company.logoUrl ? <img className="inv-logo" src={company.logoUrl} alt="Company logo" /> : <div className="inv-logo-placeholder">QC</div>}
              <div>
                <h1 className="inv-company-name">{company.name}</h1>
                <p className="inv-company-address">{company.address}</p>
              </div>
            </div>
            <div className="inv-title-wrap">
              <h2 className="inv-title">TAX INVOICE</h2>
              {isCancelledOrder && <div className="inv-cancelled-label">Cancelled Order</div>}
            </div>
          </header>

          <div className="inv-grid inv-grid-2">
            <div className="inv-panel">
              <h3>Invoice Details</h3>
              <div className="inv-kv"><span>Invoice Number</span><strong>{invoiceDetails.invoiceNumber}</strong></div>
              <div className="inv-kv"><span>Invoice Date</span><strong>{invoiceDetails.invoiceDate}</strong></div>
              <div className="inv-kv"><span>Order ID</span><strong>{invoiceDetails.orderId}</strong></div>
              <div className="inv-kv"><span>Payment Method</span><strong>{invoiceDetails.paymentMethod}</strong></div>
              <div className="inv-kv"><span>Transaction ID</span><strong>{invoiceDetails.transactionId}</strong></div>
            </div>

            <div className="inv-panel">
              <h3>Billing Details</h3>
              <div className="inv-kv"><span>Name</span><strong>{billing.name}</strong></div>
              <div className="inv-kv"><span>Phone</span><strong>{billing.phone}</strong></div>
              <div className="inv-kv"><span>Address</span><strong>{billing.address}</strong></div>

              <h3 className="inv-subheading">Shipping Details</h3>
              <div className="inv-kv"><span>Recipient</span><strong>{shipping.name}</strong></div>
              <div className="inv-kv"><span>Address</span><strong>{shipping.address}</strong></div>
            </div>
          </div>

          <div className="inv-panel">
            <h3>Items</h3>
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Tax</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="6" className="inv-empty-row">No items found</td>
                    </tr>
                  )}
                  {items.map((item, idx) => (
                    <tr key={item.id || item.orderItemId || idx}>
                      <td>{item.productName || item.name || "-"}</td>
                      <td>{item.sku || item.productSku || "-"}</td>
                      <td>{item.quantity ?? "-"}</td>
                      <td>Rs {formatCurrency(firstDefined(item.unitPrice, item.price, item.unitAmount, item.basePrice))}</td>
                      <td>Rs {formatCurrency(firstDefined(item.taxAmount, item.tax, item.totalTax, item.gstAmount))}</td>
                      <td>Rs {formatCurrency(firstDefined(item.total, item.lineTotal, item.totalAmount, item.finalAmount, item.netAmount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="inv-summary">
            <div className="inv-summary-row"><span>Subtotal</span><strong>Rs {formatCurrency(pricing.subtotal)}</strong></div>
            <div className="inv-summary-row"><span>Discount</span><strong>Rs {formatCurrency(pricing.discount)}</strong></div>
            <div className="inv-summary-row"><span>Tax</span><strong>Rs {formatCurrency(pricing.tax)}</strong></div>
            <div className="inv-summary-row"><span>Shipping</span><strong>Rs {formatCurrency(pricing.shipping)}</strong></div>
            <div className="inv-summary-row inv-summary-total"><span>Grand Total</span><strong>Rs {formatCurrency(pricing.grandTotal ?? pricing.total)}</strong></div>
          </div>
        </section>
      )}
    </div>
  );
}
