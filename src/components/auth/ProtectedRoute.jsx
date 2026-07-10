// src/components/auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { subscription, isLoading, isExpired } = useSubscription();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a84c]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If subscription is expired, redirect to billing
  if (subscription && isExpired) {
    return <Navigate to="/billing" />;
  }

  // If no subscription at all (should not happen after setup), redirect to setup
  if (!subscription) {
    return <Navigate to="/setup" />;
  }

  return children;
}
