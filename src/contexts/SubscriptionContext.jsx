// src/contexts/SubscriptionContext.jsx
//
// Single source of truth for the current hotel's subscription. Previously,
// useSubscription() was called independently in ProtectedRoute, Dashboard,
// BillingCard, and BillingPage — each instance ran its own fetch AND its own
// 15s post-payment poll, and each called window.history.replaceState to strip
// the `payment` query param. Those four cycles raced each other, so the
// `isPolling` flag from one instance never stopped the others and the UI could
// spin forever on /dashboard?payment=success.
//
// This context runs exactly ONE fetch + ONE poll per page load. Every consumer
// reads the same state. The `payment` query param is stripped exactly once.
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

const SubscriptionContext = createContext(null);

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;

export function SubscriptionProvider({ children }) {
  const { hotel } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // True while we are actively waiting for the webhook to flip status -> active.
  const [isPolling, setIsPolling] = useState(false);
  // True once polling timed out without activation: show a clear message
  // instead of an endless spinner.
  const [paymentStuck, setPaymentStuck] = useState(false);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);
  const paramStrippedRef = useRef(false);

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

    const stripPaymentParam = () => {
      // Strip the `payment` query param exactly once, app-wide.
      if (paramStrippedRef.current) return;
      paramStrippedRef.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.has("payment")) {
        params.delete("payment");
        const newSearch = params.toString();
        window.history.replaceState(
          {},
          "",
          window.location.pathname + (newSearch ? `?${newSearch}` : ""),
        );
      }
    };

    const run = async () => {
      try {
        // `latest` always holds the most recently fetched subscription so the
        // poll's break condition and the final paymentStuck decision use fresh
        // data, never a stale closure snapshot.
        let latest = await fetchSubscription();

        const params = new URLSearchParams(window.location.search);
        const cameFromPayment =
          params.get("payment") === "success" ||
          params.get("payment") === "cancelled";

        if (cameFromPayment) {
          setIsPolling(true);
          setPaymentStuck(false);
          const start = Date.now();

          while (
            !cancelled &&
            latest?.subscription_status !== "active" &&
            Date.now() - start < POLL_TIMEOUT_MS
          ) {
            await new Promise(
              (r) => (pollRef.current = setTimeout(r, POLL_INTERVAL_MS)),
            );
            latest = await fetchSubscription();
          }

          setIsPolling(false);

          if (!cancelled && latest?.subscription_status !== "active") {
            // Polling timed out without activation. Don't spin forever —
            // surface a clear "still confirming" state instead.
            setPaymentStuck(true);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          // Always strip the param when we're done, regardless of outcome.
          stripPaymentParam();
        }
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

  const value = {
    subscription,
    isLoading,
    isPolling,
    paymentStuck,
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

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider (wrap the app in <SubscriptionProvider>).",
    );
  }
  return ctx;
}
