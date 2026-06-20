// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { HotelProvider } from "./contexts/HotelContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import Dashboard from "./components/dashboard/Dashboard";
import GuestPortal from "./components/guest/GuestPortal";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <HotelProvider>
          <Toaster position="bottom-center" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/guest" element={<GuestPortal />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HotelProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
