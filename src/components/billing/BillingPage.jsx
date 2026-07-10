// src/components/billing/BillingPage.jsx
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../hooks/useSubscription";
import { usePayments } from "../../hooks/usePayments";
import { useState } from "react";
import toast from "react-hot-toast";
import ManagePlan from "./ManagePlan";
import TrialBanner from "./TrialBanner";
import ErrorBoundary from "../ErrorBoundary";

export default function BillingPage() {
  const { hotel } = useAuth();
  const navigate = useNavigate();
  const {
    subscription,
    isLoading: subLoading,
    isTrial,
    isActive,
    isExpired,
    trialDaysRemaining,
    daysUntilExpiration,
  } = useSubscription();
  const { payments, isLoading: paymentsLoading } = usePayments();
  const [showManagePlan, setShowManagePlan] = useState(false);

  const handleSubscribe = async () => {
    // Create checkout session
    if (!hotel?.id) {
      toast.error("Hotel not found. Please set up your hotel first.");
      return;
    }
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hotelId: hotel.id,
            roomCount: subscription?.room_count,
            successUrl: `${window.location.origin}/dashboard?payment=success`,
            cancelUrl: `${window.location.origin}/billing?payment=cancelled`,
          }),
        },
      );
      const { checkoutUrl } = await response.json();
      if (checkoutUrl) window.location.href = checkoutUrl;
    } catch (err) {
      toast.error("Failed to initiate payment. Please try again.");
    }
  };

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription at the end of the current period?",
      )
    )
      return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hotelId: hotel.id }),
        },
      );
      if (response.ok) {
        toast.success(
          "Subscription will be cancelled at the end of the period.",
        );
        // Refetch subscription
        window.location.reload();
      } else {
        throw new Error("Failed to cancel");
      }
    } catch (err) {
      toast.error("Failed to cancel subscription.");
    }
  };

  if (subLoading)
    return <div className="p-8 text-center">Loading billing info...</div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f7f3ee] p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-[#0f1b2d] mb-6">
            Billing & Subscription
          </h1>

          {/* Trial Banner if expiring soon */}
          {isTrial && trialDaysRemaining <= 7 && trialDaysRemaining > 0 && (
            <TrialBanner
              daysRemaining={trialDaysRemaining}
              onSubscribe={handleSubscribe}
            />
          )}

          {/* Expired state */}
          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold text-red-700">
                Subscription Expired
              </h2>
              <p className="text-red-600 mt-1">
                Your trial or subscription has ended. Please renew to continue
                using StayKila.
              </p>
              <button
                onClick={handleSubscribe}
                className="mt-4 bg-[#c9a84c] text-[#0f1b2d] px-6 py-2 rounded-lg font-semibold hover:bg-[#b8973a] transition">
                Renew Now
              </button>
            </div>
          )}

          {/* Current Plan Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-[#0f1b2d]">
                  Current Plan
                </h2>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-[#c9a84c]/20 text-[#c9a84c]">
                    {isTrial ? "Trial" : isActive ? "Active" : "Expired"}
                  </span>
                  {isTrial && (
                    <span className="ml-2 text-sm text-gray-500">
                      {trialDaysRemaining} days remaining
                    </span>
                  )}
                  {isActive && (
                    <span className="ml-2 text-sm text-gray-500">
                      Renews in {daysUntilExpiration} days
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Monthly Cost</p>
                <p className="text-2xl font-bold text-[#0f1b2d]">
                  ₱{subscription?.monthly_amount?.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Rooms</p>
                <p className="text-lg font-semibold">
                  {subscription?.room_count}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Price per Room</p>
                <p className="text-lg font-semibold">
                  ₱{subscription?.price_per_room?.toLocaleString()}
                </p>
              </div>
            </div>
            {isActive && subscription?.cancel_at_period_end && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-700 text-sm">
                  Your subscription will end on{" "}
                  {new Date(
                    subscription.current_period_end,
                  ).toLocaleDateString()}
                  .
                </p>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {!isExpired && (
                <button
                  onClick={() => setShowManagePlan(true)}
                  className="bg-[#0f1b2d] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1a2d4a] transition">
                  Manage Plan
                </button>
              )}
              {isActive && !subscription?.cancel_at_period_end && (
                <button
                  onClick={handleCancel}
                  className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition">
                  Cancel Subscription
                </button>
              )}
              {isExpired && (
                <button
                  onClick={handleSubscribe}
                  className="bg-[#c9a84c] text-[#0f1b2d] px-6 py-2 rounded-lg font-semibold hover:bg-[#b8973a] transition">
                  Renew Now
                </button>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-[#0f1b2d] mb-4">
              Payment History
            </h3>
            {paymentsLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : payments.length === 0 ? (
              <p className="text-gray-500">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Method</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-b-0">
                        <td className="py-2">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2">₱{p.amount?.toLocaleString()}</td>
                        <td className="py-2 capitalize">
                          {p.payment_method || "—"}
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              p.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : p.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manage Plan Modal */}
          {showManagePlan && subscription && (
            <ManagePlan
              currentRooms={subscription.room_count}
              currentAmount={subscription.monthly_amount}
              pricePerRoom={subscription.price_per_room}
              onClose={() => setShowManagePlan(false)}
              hotelId={hotel.id}
              onPlanChanged={() => {
                setShowManagePlan(false);
                window.location.reload();
              }}
            />
          )}
        </div>
      </div>{" "}
    </ErrorBoundary>
  );
}
