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
const ManufacturerDashboard = lazy(() => import("./pages/ManufacturerDashboard"));
const ManufacturerProducts = lazy(() => import("./pages/ManufacturerProducts"));
const ManufacturerOrders = lazy(() => import("./pages/ManufacturerOrders"));
const ManufacturerOrderDetails = lazy(() => import("./pages/ManufacturerOrderDetails"));
const ManufacturerPayments = lazy(() => import("./pages/ManufacturerPayments"));
const RetailerDashboard = lazy(() => import("./pages/RetailerDashboard"));
const RetailerProducts = lazy(() => import("./pages/RetailerProducts"));
const RetailerProductDetails = lazy(() => import("./pages/RetailerProductDetails"));
const RetailerOrders = lazy(() => import("./pages/RetailerOrders"));
const RetailerInvoices = lazy(() => import("./pages/RetailerInvoices"));
const RetailerWishlist = lazy(() => import("./pages/RetailerWishlist"));
const RetailerBag = lazy(() => import("./pages/RetailerBag"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const OrderCancel = lazy(() => import("./pages/OrderCancel"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* ── Helpers that use AuthContext instead of raw localStorage ── */

function LandingRedirect() {
  const { user, authReady } = useAuth();
  if (!authReady) return <Loader fullPage text="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "MANUFACTURER" ? "/manufacturer" : "/retailer"} replace />;
}

function LoginRedirect() {
  const { user, authReady } = useAuth();
  if (!authReady) return <Loader fullPage text="Loading…" />;
  if (user) return <Navigate to={user.role === "MANUFACTURER" ? "/manufacturer" : "/retailer"} replace />;
  return <Login />;
}

function App() {
  const location = useLocation();

  // Hide navbar on login page
  const showNavbar = location.pathname !== "/login";

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

          {/* Manufacturer */}
          <Route
            path="/manufacturer"
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

          {/* Retailer */}
          <Route
            path="/retailer"
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

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
