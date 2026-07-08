// src/components/auth/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const { subscription, isLoading } = useSubscription();

  // Show loading spinner while auth or subscription is being fetched
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

  // Check subscription/trial validity
  if (subscription) {
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    const isActive =
      subscription.subscription_status === "active" ||
      (subscription.subscription_status === "trial" && trialEnd > now);

    if (!isActive) {
      // Redirect to pricing page with a renewal flag
      return <Navigate to="/pricing?renew=true" />;
    }
  } else {
    // No subscription? Possibly a new user without setup – redirect to setup
    return <Navigate to="/setup" />;
  }

  return children;
}
