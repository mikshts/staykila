import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";

export default function ProtectedRoute({ children, allowExpired = false }) {
  const { user, loading, hotel } = useAuth(); // ensure hotel is available
  const { subscription, isLoading, isExpired, error } = useSubscription();

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

  // If subscription is expired, redirect to billing
  if (subscription && isExpired && !allowExpired) {
    return <Navigate to="/billing" />;
  }

  // If no subscription and no hotel, redirect to setup
  if (!subscription && !hotel) {
    return <Navigate to="/setup" />;
  }

  // If hotel exists but subscription is still null (e.g., just created), render children
  return children;
}
