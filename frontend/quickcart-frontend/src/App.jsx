import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ManufacturerDashboard from "./pages/ManufacturerDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Default route */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Manufacturer */}
      <Route
        path="/manufacturer"
        element={
          <ProtectedRoute allowedRoles={["MANUFACTURER"]}>
            <ManufacturerDashboard />
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
    </Routes>
  );
}

export default App;
