import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ManufacturerDashboard from "./pages/ManufacturerDashboard";
import RetailerDashboard from "./pages/RetailerDashboard";
import { AuthProvider } from "./auth/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/manufacturer" element={<ManufacturerDashboard />} />
          <Route path="/retailer" element={<RetailerDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
