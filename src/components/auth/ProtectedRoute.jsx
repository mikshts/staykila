import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";

export default function ProtectedRoute({ children }) {
  const { user, loading, hotel, setupComplete } = useAuth(); // ensure hotel is available
  const { subscription, isLoading, isExpired, error } = useSubscription();
  const location = useLocation();

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

  // If hotel exists but subscription fetch had an error, don't redirect to setup
  if (error && hotel) {
    console.warn("Subscription fetch error, but hotel exists:", error);
    return children;
  }

  // If subscription is expired, redirect to billing — unless already on the
  // billing page (the one place expired users are allowed to land). Without
  // this guard, /billing (also wrapped in ProtectedRoute) would redirect back
  // to itself, causing an infinite loop and a blank page.
  if (subscription && isExpired && location.pathname !== "/billing") {
    return <Navigate to="/billing" replace />;
  }

  // Setup is not complete (no hotel or no rooms) -> force hotel setup.
  // The dashboard must NOT be accessible until setup is complete.
  if (!setupComplete) {
    return <Navigate to="/hotel-setup" replace />;
  }

  // Hotel exists and setup is complete -> render the dashboard.
  return children;
}
