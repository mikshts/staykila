// src/components/billing/BillingPage.jsx
import { useAuth } from "../../contexts/AuthContext";
import { useSubscription } from "../../contexts/SubscriptionContext";
import { usePayments } from "../../hooks/usePayments";
import { supabase } from "../../lib/supabase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import TrialBanner from "./TrialBanner";
import ErrorBoundary from "../ErrorBoundary";

const CANCEL_CONFIRM_PHRASE = "CANCEL MY SUBSCRIPTION";

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
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelText, setCancelText] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // If PayMongo redirected back with ?session_id (it appends this on success),
  // stash it so the post-payment verifier can confirm the EXACT session that
  // just completed. This is what fixes the "second payment doesn't work" bug:
  // previously we relied on the subscription's provider_subscription_id column,
  // which only holds the FIRST checkout session ever created, so repeat
  // payments could never be verified.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (sessionId) {
      sessionStorage.setItem("staykila_checkout_session", sessionId);
      // Clean the param out of the visible URL.
      params.delete("session_id");
      const newSearch = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (newSearch ? `?${newSearch}` : ""),
      );
    }
  }, []);

  // Derive the current monthly cost from room_count * price_per_room so the
  // displayed figure is always internally consistent with the per-room price.
  const currentMonthly =
    (subscription?.room_count || 0) * (subscription?.price_per_room || 0);

  const handleSubscribe = async () => {
    // Create checkout session
    if (!hotel?.id) {
      toast.error("Hotel not found. Please set up your hotel first.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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

      const data = await response.json();
      if (!response.ok) {
        // Surface the actual error returned by the edge function instead of
        // failing silently (the function returns { error: "..." } on failure).
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      if (data.checkoutUrl) {
        // Persist the checkout session id so the post-payment verifier can
        // confirm the payment directly with PayMongo if the webhook is slow.
        if (data.sessionId) {
          sessionStorage.setItem("staykila_checkout_session", data.sessionId);
        }
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No checkout URL was returned. Please try again.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to initiate payment. Please try again.");
    }
  };

  // Manually re-confirm a specific payment with PayMongo. This is the recovery
  // path: if a renewal's webhook/auto-verify didn't flip it to paid (e.g. the
  // redirect session_id was lost, or the DB was edited), the user can press
  // "Verify" on the pending row and we'll activate it directly.
  const verifyPaymentRecord = async (sessionId) => {
    if (!sessionId) {
      toast.error("No checkout session linked to this payment.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hotelId: hotel.id, sessionId }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed.");
      if (data.paid || data.status === "active") {
        toast.success("Payment confirmed — subscription activated!");
        window.location.reload();
      } else {
        toast.error("PayMongo shows this payment is not paid yet.");
      }
    } catch (err) {
      toast.error(err.message || "Could not verify payment.");
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hotelId: hotel.id }),
        },
      );
      if (response.ok) {
        toast.success(
          "Subscription will be cancelled at the end of the period.",
        );
        setShowCancelModal(false);
        setCancelText("");
        // Refetch subscription
        window.location.reload();
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel");
      }
    } catch (err) {
      toast.error("Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  if (subLoading)
    return <div className="p-8 text-center">Loading billing info...</div>;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f7f3ee] p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-[#0f1b2d] mb-6">
            Billing &amp; Subscription
          </h1>

          {/* Back to Dashboard */}
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#0f1b2d] hover:text-[#c9a84c] transition">
            <span aria-hidden="true">&larr;</span> Back to Dashboard
          </button>

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
                  ₱{currentMonthly.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {subscription?.room_count} rooms × ₱
                  {subscription?.price_per_room?.toLocaleString()}/room
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Rooms</p>
                <p className="text-lg font-semibold">
                  {subscription?.room_count}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Set during hotel setup
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
              {isExpired && (
                <button
                  onClick={handleSubscribe}
                  className="bg-[#c9a84c] text-[#0f1b2d] px-6 py-2 rounded-lg font-semibold hover:bg-[#b8973a] transition">
                  Renew Now
                </button>
              )}
              {isActive && !subscription?.cancel_at_period_end && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition">
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>

          {/* Cancel confirmation modal — requires typing the exact phrase so a
              subscription can't be cancelled by accident. */}
          {showCancelModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
                <h2 className="text-xl font-bold text-[#0f1b2d] mb-2">
                  Cancel subscription?
                </h2>
                <p className="text-sm text-gray-600 mb-1">
                  This will cancel your subscription at the end of the current
                  billing period. To confirm, type the following phrase exactly:
                </p>
                <p className="font-mono text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 select-all">
                  {CANCEL_CONFIRM_PHRASE}
                </p>
                <input
                  type="text"
                  value={cancelText}
                  onChange={(e) => setCancelText(e.target.value)}
                  placeholder={CANCEL_CONFIRM_PHRASE}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#c9a84c] focus:border-[#c9a84c] mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelText("");
                    }}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                    Keep Subscription
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling || cancelText !== CANCEL_CONFIRM_PHRASE}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50">
                    {cancelling ? "Cancelling..." : "Cancel Subscription"}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                          {p.status !== "paid" && p.paymongo_session_id && (
                            <button
                              onClick={() => verifyPaymentRecord(p.paymongo_session_id)}
                              className="block mt-1 text-xs text-[#c9a84c] hover:underline">
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>{" "}
    </ErrorBoundary>
  );
}
