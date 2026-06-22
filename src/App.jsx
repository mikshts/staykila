// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { HotelProvider } from "./contexts/HotelContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./components/auth/Login";
import LandingPage from "./pages/LandingPage";

import Register from "./components/auth/Register";
import Dashboard from "./components/dashboard/Dashboard";
import GuestPortal from "./components/guest/GuestPortal";
import AuthCallback from "./components/auth/AuthCallback";
import HotelSetup from "./components/auth/HotelSetup";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HotelProvider>
          <Toaster position="bottom-center" />
          <Routes>
            <Route path="/login" element={<LandingPage />} />
            <Route path="/signin" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/setup" element={<HotelSetup />} />
            <Route path="/guest" element={<GuestPortal />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HotelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
