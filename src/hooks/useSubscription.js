// src/hooks/useSubscription.js
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function useSubscription() {
  const { hotel } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const fetchSubscription = useCallback(async () => {
    if (!hotel?.id) return null;
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotel.id)
      .maybeSingle();

    if (error) throw error;
    setSubscription(data || null);
    return data;
  }, [hotel]);

  useEffect(() => {
    if (!hotel?.id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const data = await fetchSubscription();

        // If we just came back from a successful payment, the webhook may
        // not have landed yet. Poll for a bit until status flips to active
        // (or a pending change is applied), instead of trusting this
        // first snapshot.
        const params = new URLSearchParams(window.location.search);
        if (params.get("payment") === "success") {
          setIsPolling(true);
          const start = Date.now();
          const maxWaitMs = 15000;
          const intervalMs = 1500;

          while (
            !cancelled &&
            data?.subscription_status !== "active" &&
            Date.now() - start < maxWaitMs
          ) {
            await new Promise(
              (r) => (pollRef.current = setTimeout(r, intervalMs)),
            );
            const fresh = await fetchSubscription();
            if (fresh?.subscription_status === "active") break;
          }

          setIsPolling(false);

          // Clean the query param so a refresh doesn't re-trigger polling
          params.delete("payment");
          const newSearch = params.toString();
          window.history.replaceState(
            {},
            "",
            window.location.pathname + (newSearch ? `?${newSearch}` : ""),
          );
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [hotel, fetchSubscription]);

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
    isPolling,
    error,
    isTrial,
    isActive,
    isPastDue,
    isExpired,
    trialDaysRemaining,
    daysUntilExpiration,
    isExpiringSoon,
    refetchSubscription: fetchSubscription,
  };
}
