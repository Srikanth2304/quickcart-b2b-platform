import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Loader from "./components/Loader";

/* ── Lazy-loaded pages (code-split per route) ── */
const Login = lazy(() => import("./pages/Login"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const OAuthStart = lazy(() => import("./pages/OAuthStart"));
const OAuthCallback = lazy(() => import("./pages/OAuthCallback"));
const SuperAdminDashboard = lazy(() => import("./pages/superAdmin/Dashboard"));
const SuperAdminAdmins = lazy(() => import("./pages/superAdmin/Admins"));
const SuperAdminUsers = lazy(() => import("./pages/superAdmin/Users"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminCatalogManagers = lazy(() => import("./pages/admin/CatalogManagers"));
const CatalogDashboard = lazy(() => import("./pages/catalog/Dashboard"));
const CatalogPendingUsers = lazy(() => import("./pages/catalog/PendingUsers"));
const CatalogBrands = lazy(() => import("./pages/catalog/Brands"));
const CatalogCategories = lazy(() => import("./pages/catalog/Categories"));
const ManufacturerDashboard = lazy(() => import("./pages/manufacturer/Dashboard"));
const ManufacturerProducts = lazy(() => import("./pages/manufacturer/Products"));
const ManufacturerCreateProduct = lazy(() => import("./pages/manufacturer/CreateProduct"));
const ManufacturerOrders = lazy(() => import("./pages/ManufacturerOrders"));
const ManufacturerOrderDetails = lazy(() => import("./pages/ManufacturerOrderDetails"));
const ManufacturerPayments = lazy(() => import("./pages/ManufacturerPayments"));
const ManufacturerShipments = lazy(() => import("./pages/manufacturer/Shipments"));
const ManufacturerReturns = lazy(() => import("./pages/manufacturer/Returns"));
const RetailerDashboard = lazy(() => import("./pages/RetailerDashboard"));
const RetailerProducts = lazy(() => import("./pages/RetailerProducts"));
const RetailerProductDetails = lazy(() => import("./pages/RetailerProductDetails"));
const RetailerOrders = lazy(() => import("./pages/RetailerOrders"));
const RetailerInvoices = lazy(() => import("./pages/RetailerInvoices"));
const RetailerWishlist = lazy(() => import("./pages/RetailerWishlist"));
const RetailerBag = lazy(() => import("./pages/RetailerBag"));
const RetailerReturns = lazy(() => import("./pages/retailer/Returns"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const OrderCancel = lazy(() => import("./pages/OrderCancel"));
const InvoicePage = lazy(() => import("./pages/InvoicePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* ── Helpers that use AuthContext instead of raw localStorage ── */

function getHomeByRole(role) {
  switch (String(role || "").replace(/^ROLE_/, "").toUpperCase()) {
    case "SUPER_ADMIN":
      return "/super-admin/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "CATALOG_MANAGER":
      return "/catalog/dashboard";
    case "MANUFACTURER":
      return "/manufacturer/dashboard";
    case "RETAILER":
      return "/retailer/dashboard";
    default:
      return "/login";
  }
}

function LandingRedirect() {
  const { user, approvalStatus, authReady } = useAuth();
  if (!authReady) return <Loader fullPage text="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (String(approvalStatus || "").toUpperCase() === "PENDING") {
    return <Navigate to="/pending-approval" replace />;
  }
  return <Navigate to={getHomeByRole(user.role)} replace />;
}

function LoginRedirect() {
  const { user, approvalStatus, authReady } = useAuth();
  if (!authReady) return <Loader fullPage text="Loading…" />;
  if (user && String(approvalStatus || "").toUpperCase() === "PENDING") {
    return <Navigate to="/pending-approval" replace />;
  }
  if (user) return <Navigate to={getHomeByRole(user.role)} replace />;
  return <Login />;
}

function App() {
  const location = useLocation();
  const isAdminOrPendingPath =
    location.pathname.startsWith("/super-admin") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/catalog") ||
    location.pathname === "/pending-approval";

  // Hide navbar on login page
  const showNavbar = !(location.pathname === "/login" || location.pathname.startsWith("/oauth/") || isAdminOrPendingPath);

  return (
    <ErrorBoundary>
      {showNavbar && <Navbar />}
      <Toast />

      <Suspense fallback={<Loader fullPage text="Loading page…" />}>
        <Routes>
          {/* Default route */}
          <Route path="/" element={<LandingRedirect />} />

          {/* Public */}
          <Route path="/login" element={<LoginRedirect />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/oauth/start/:provider" element={<OAuthStart />} />
          <Route path="/oauth/callback/:provider" element={<OAuthCallback />} />

          {/* Super Admin */}
          <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/admins"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminAdmins />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/users"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminUsers />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/catalog-managers"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminCatalogManagers />
              </ProtectedRoute>
            }
          />

          {/* Catalog Manager */}
          <Route path="/catalog" element={<Navigate to="/catalog/dashboard" replace />} />
          <Route
            path="/catalog/dashboard"
            element={
              <ProtectedRoute role="CATALOG_MANAGER">
                <CatalogDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog/pending-users"
            element={
              <ProtectedRoute role="CATALOG_MANAGER">
                <CatalogPendingUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog/brands"
            element={
              <ProtectedRoute role="CATALOG_MANAGER">
                <CatalogBrands />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalog/categories"
            element={
              <ProtectedRoute role="CATALOG_MANAGER">
                <CatalogCategories />
              </ProtectedRoute>
            }
          />

          {/* Manufacturer */}
          <Route
            path="/manufacturer"
            element={<Navigate to="/manufacturer/dashboard" replace />}
          />

          <Route
            path="/manufacturer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
                <ManufacturerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/products"
            element={
              <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
                <ManufacturerProducts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/create-product"
            element={
              <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
                <ManufacturerCreateProduct />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/orders"
            element={
              <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
                <ManufacturerOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
                <ManufacturerOrderDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/payments"
            element={
              <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
                <ManufacturerPayments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/shipments"
            element={
              <ProtectedRoute role="MANUFACTURER">
                <ManufacturerShipments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/manufacturer/returns"
            element={
              <ProtectedRoute role="MANUFACTURER">
                <ManufacturerReturns />
              </ProtectedRoute>
            }
          />

          {/* Retailer */}
          <Route
            path="/retailer"
            element={<Navigate to="/retailer/dashboard" replace />}
          />

          <Route
            path="/retailer/dashboard"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/products"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerProducts />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/products/:id"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerProductDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/orders"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerOrders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/invoices"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerInvoices />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/wishlist"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerWishlist />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/bag"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <RetailerBag />
              </ProtectedRoute>
            }
          />

          <Route
            path="/retailer/returns"
            element={
              <ProtectedRoute role="RETAILER">
                <RetailerReturns />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:orderId"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <OrderDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/:orderId/cancel"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <OrderCancel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders/success"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <OrderSuccess />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoice/:orderId"
            element={
              <ProtectedRoute allowedRoles={["RETAILER"]}>
                <InvoicePage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
