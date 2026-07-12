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
//
// Self-healing: after a successful PayMongo redirect (?payment=success) we
// poll the DB for activation, but we ALSO call the `verify-payment` edge
// function which asks PayMongo directly and activates the subscription/payment
// idempotently. This means a delayed/misconfigured webhook no longer leaves the
// subscription stuck on "pending" forever.
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
const POLL_TIMEOUT_MS = 20000;

export function SubscriptionProvider({ children }) {
  const { hotel, user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // True while we are actively waiting for activation to be confirmed.
  const [isPolling, setIsPolling] = useState(false);
  // True once polling timed out without activation: show a clear message
  // instead of an endless spinner.
  const [paymentStuck, setPaymentStuck] = useState(false);
  const [error, setError] = useState(null);

  const pollRef = useRef(null);
  const paramStrippedRef = useRef(false);
  // The PayMongo checkout session id captured from the success redirect, used
  // by the self-healing verifier.
  const sessionIdRef = useRef(null);

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

  // Ask the edge function to confirm the payment with PayMongo directly and
  // activate the subscription/payment record. Returns true if it succeeded.
  const verifyPayment = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !hotel?.id) return false;
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
      if (!res.ok) return false;
      const data = await res.json();
      return data?.paid === true || data?.status === "active";
    } catch (err) {
      console.warn("verify-payment call failed:", err);
      return false;
    }
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
          // Capture the checkout session id so we can self-heal via the
          // verify-payment edge function.
          //
          // PREFERENCE ORDER (this is what fixes the "second payment doesn't
          // work" bug):
          //   1. ?session_id on the redirect URL — PayMongo appends the exact
          //      session that just completed, so this is always correct even
          //      on repeat payments.
          //   2. sessionStorage stashed at checkout time (fallback).
          //   3. subscription.provider_subscription_id — ONLY the first ever
          //      checkout session, so it is the weakest signal and must be
          //      last. Relying on it alone is why repeat payments failed.
          const urlParams = new URLSearchParams(window.location.search);
          const sessionFromUrl = urlParams.get("session_id");
          const sessionFromStorage = sessionStorage.getItem(
            "staykila_checkout_session",
          );
          const storedSession =
            sessionFromUrl || sessionFromStorage || latest?.provider_subscription_id;
          if (storedSession) sessionIdRef.current = storedSession;
          // Clear the stash now that we've captured it.
          sessionStorage.removeItem("staykila_checkout_session");

          setIsPolling(true);
          setPaymentStuck(false);
          const start = Date.now();

          while (
            !cancelled &&
            latest?.subscription_status !== "active" &&
            Date.now() - start < POLL_TIMEOUT_MS
          ) {
            // Self-heal: try to confirm + activate via PayMongo directly.
            // If it succeeds, the next DB read will show `active` and the
            // loop exits cleanly.
            await verifyPayment();

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
  }, [hotel, fetchSubscription, verifyPayment]);

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
