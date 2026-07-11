// src/components/dashboard/SubscriptionManager.jsx
import { useState } from "react";
import { useSubscription } from "../../hooks/useSubscription";
import { useAuth } from "../../contexts/AuthContext"; // ← was useHotel from HotelContext
import { supabase } from "../../lib/supabase";

export default function SubscriptionManager() {
  const { subscription, isLoading } = useSubscription();
  const { hotel } = useAuth(); // ← use the real hotel
  const [loading, setLoading] = useState(false);

  const isActive =
    subscription?.subscription_status === "active" ||
    (subscription?.subscription_status === "trial" &&
      new Date(subscription.trial_end) > new Date());

  const handleSubscribe = async () => {
    if (!hotel?.id) return;
    setLoading(true);
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
            roomCount: subscription?.room_count || 10,
            hotelId: hotel.id,
            successUrl: `${window.location.origin}/dashboard?payment=success`,
            cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("Payment initiation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return null; // or a small spinner

  // If subscription is active or trial active, show nothing (or a small status badge)
  if (isActive) {
    return (
      <div className="px-4 py-2 text-xs text-green-400 bg-green-900/20 rounded-lg inline-block">
        ✅ Active subscription
      </div>
    );
  }

  // Trial expired or inactive – show subscription banner
  return (
    <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-4 my-4 text-center">
      <p className="text-yellow-400 font-semibold">
        ⚠️ Your free trial has ended.
      </p>
      <p className="text-gray-300 text-sm mt-1">
        Subscribe now to continue managing your property.
      </p>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="mt-3 px-6 py-2 bg-[#c9a84c] text-[#0f1b2d] font-semibold rounded-lg hover:bg-[#b8973a] transition disabled:opacity-50">
        {loading ? "Processing..." : "Subscribe Now"}
      </button>
    </div>
  );
}
