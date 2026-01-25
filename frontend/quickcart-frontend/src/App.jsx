import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import ManufacturerDashboard from "./pages/ManufacturerDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import ManufacturerProducts from "./pages/ManufacturerProducts";
import ManufacturerOrders from "./pages/ManufacturerOrders";
import ManufacturerPayments from "./pages/ManufacturerPayments";
import RetailerProducts from "./pages/RetailerProducts";
import RetailerProductDetails from "./pages/RetailerProductDetails";
import RetailerOrders from "./pages/RetailerOrders";
import RetailerInvoices from "./pages/RetailerInvoices";
import RetailerWishlist from "./pages/RetailerWishlist";
import ProtectedRoute from "./routes/ProtectedRoute";
import Navbar from "./components/Navbar";

function getDefaultAuthedPath() {
  const role = localStorage.getItem("role");
  return role === "MANUFACTURER" ? "/manufacturer" : "/retailer";
}

function LandingRedirect() {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultAuthedPath()} replace />;
}

function LoginRedirect() {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to={getDefaultAuthedPath()} replace />;
  return <Login />;
}

function App() {
  const location = useLocation();

  // Hide navbar on login page
  const showNavbar = location.pathname !== "/login";

  return (
    <>
      {showNavbar && <Navbar />}

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

        {/* Fallback */}
        <Route path="*" element={<LandingRedirect />} />
      </Routes>
    </>
  );
}

export default App;
