// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./components/auth/Login";
import LandingPage from "./pages/LandingPage";

import Register from "./components/auth/Register";
import Dashboard from "./components/dashboard/Dashboard";
import GuestPortal from "./components/guest/GuestPortal";
import AuthCallback from "./components/auth/AuthCallback";
import HotelSetup from "./components/auth/HotelSetup";
import PricingPage from "./pages/PricingPage";
import BillingPage from "./components/billing/BillingPage";

// Guards /hotel-setup: only reachable when the user is authenticated but
// has NOT completed setup yet. Once setup is complete, bounce to dashboard.
function HotelSetupRoute() {
  const { user, loading, setupComplete } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a84c]" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (setupComplete) return <Navigate to="/dashboard" replace />;
  return <HotelSetup />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-center" />
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/hotel-setup" element={<HotelSetupRoute />} />
          <Route path="/guest" element={<GuestPortal />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
