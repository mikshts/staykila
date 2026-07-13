import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../contexts/SubscriptionContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, hotel, setupComplete } = useAuth(); // ensure hotel is available
  const {
    subscription,
    isLoading,
    isPolling,
    paymentStuck,
    isExpired,
    error,
  } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading || isLoading || isPolling) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a84c]" />
      </div>
    );
  }

  // Post-payment: webhook/auto-verify hasn't confirmed activation yet.
  // On the billing page we render the page itself (so the user can see their
  // payment history and use the manual "Verify" button as a fallback). Elsewhere
  // we show a clear "confirming" screen with an escape hatch to billing.
  if (paymentStuck && location.pathname !== "/billing") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c9a84c] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#0f1b2d] mb-2">
            We're confirming your payment
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            This can take a moment. If this doesn't update within a minute,
            please refresh or contact support.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="bg-[#0f1b2d] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1a2d4a] transition">
              Check again
            </button>
            <button
              onClick={() => navigate("/billing")}
              className="text-sm text-[#c9a84c] hover:underline">
              Go to Billing to verify manually
            </button>
          </div>
        </div>
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
