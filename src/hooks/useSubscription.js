// src/hooks/useSubscription.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function useSubscription() {
  const { hotel } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotel?.id) {
      setIsLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("hotel_id", hotel.id)
          .maybeSingle();

        if (error) throw error;
        setSubscription(data || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, [hotel]);

  // Computed properties
  const isTrial = subscription?.subscription_status === "trial";
  const isActive = subscription?.subscription_status === "active";
  const isPastDue = subscription?.subscription_status === "past_due";
  const isExpired =
    subscription?.subscription_status === "expired" ||
    (isTrial && new Date(subscription.trial_end) < new Date()) ||
    (isActive && new Date(subscription.current_period_end) < new Date());

  const trialDaysRemaining = isTrial
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.trial_end) - new Date()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const daysUntilExpiration = isActive
    ? Math.max(
        0,
        Math.ceil(
          (new Date(subscription.current_period_end) - new Date()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  const isExpiringSoon = isActive && daysUntilExpiration <= 7;

  return {
    subscription,
    isLoading,
    error,
    isTrial,
    isActive,
    isPastDue,
    isExpired,
    trialDaysRemaining,
    daysUntilExpiration,
    isExpiringSoon,
  };
}
