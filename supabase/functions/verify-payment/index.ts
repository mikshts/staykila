// supabase/functions/verify-payment/index.ts
//
// SECURE payment confirmation.
//
// This function is called from the ?payment=success redirect (SubscriptionContext
// auto-verify) and from the manual "Verify" button on the billing page. It does
// NOT trust the redirect or the button click as proof of payment. Instead it
// asks PayMongo directly for the checkout session status and only activates the
// subscription / creates a payment record when PayMongo reports the payment as
// actually PAID.
//
// Idempotent: a payment already "paid" is a no-op, so the webhook and this
// function can both safely run without double-adding a month.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PAYMONGO_SECRET = Deno.env.get("PAYMONGO_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Query PayMongo for the live status of a checkout session. Returns
// { status, paymentMethod } where status is a normalized string:
// "paid" | "pending" | "expired" | "unknown" | null (lookup failed).
async function getPayMongoSessionStatus(sessionId) {
  if (!PAYMONGO_SECRET) {
    console.error(
      "PAYMONGO_SECRET_KEY is not set; cannot verify with PayMongo.",
    );
    return { status: null, paymentMethod: null };
  }
  try {
    const res = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(PAYMONGO_SECRET + ":")}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!res.ok) {
      console.error("PayMongo session lookup failed:", res.status);
      return { status: null, paymentMethod: null };
    }
    const json = await res.json();
    const attrs = json?.data?.attributes;
    if (!attrs) return { status: null, paymentMethod: null };

    // IMPORTANT: the Checkout Session's own top-level `status` field only
    // ever reflects whether the session itself is open or expired
    // ("active" / "expired") — it is NOT the payment result and NEVER
    // becomes "paid". Comparing this field to "paid" (the old bug) could
    // never succeed, so a real payment was never detected and the user got
    // stuck on the billing page forever after paying.
    //
    // The real outcome lives on the embedded Payment Intent
    // (`payment_intent.attributes.status`, one of:
    // awaiting_payment_method / awaiting_next_action / processing / succeeded)
    // and/or the `payments` array (each with its own `status: "paid"`).
    const paymentIntentStatus = attrs.payment_intent?.attributes?.status;
    const payments = attrs.payments || [];
    const paidPayment = payments.find((p) => p?.attributes?.status === "paid");

    if (paymentIntentStatus === "succeeded" || paidPayment) {
      const paymentMethod =
        paidPayment?.attributes?.source?.type ||
        attrs.payment_method_used ||
        "paymongo";
      return { status: "paid", paymentMethod };
    }

    if (
      paymentIntentStatus === "processing" ||
      paymentIntentStatus === "awaiting_payment_method" ||
      paymentIntentStatus === "awaiting_next_action"
    ) {
      return { status: "pending", paymentMethod: null };
    }

    // Session itself expired/cancelled with no successful payment intent.
    return { status: attrs.status ?? "unknown", paymentMethod: null };
  } catch (err) {
    console.error("Error querying PayMongo session:", err);
    return { status: null, paymentMethod: null };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error(
        "Server configuration error: SUPABASE_URL / SERVICE_ROLE_KEY are not set.",
      );
    }

    const { hotelId } = await req.json();
    if (!hotelId) throw new Error("Missing required field: hotelId.");

    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        },
      );
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("hotel_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !userData || userData.hotel_id !== hotelId) {
      return new Response(
        JSON.stringify({
          error: "Forbidden: Access denied to this hotel's resources",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        },
      );
    }

    // Load the hotel's subscription.
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (subError) throw subError;
    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found for hotel." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Already active? Report the current status without doing anything.
    if (subscription.subscription_status === "active") {
      return new Response(
        JSON.stringify({ status: "active", paid: true, nothingToVerify: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // We have no pending payment row to inspect (create-checkout no longer
    // inserts one). The only trustworthy signal is PayMongo itself. If there
    // is no checkout session id recorded, there is nothing to verify.
    const sessionId = subscription.provider_subscription_id;
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          status: subscription.subscription_status,
          paid: false,
          message: "No payment in progress.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ask PayMongo for the real status. Never trust the redirect/button.
    const { status: paymongoStatus, paymentMethod } =
      await getPayMongoSessionStatus(sessionId);

    // Only a confirmed "paid" status activates the subscription. Anything else
    // (pending, expired, unknown, or a failed lookup) is reported back and
    // the subscription is left untouched.
    if (paymongoStatus !== "paid") {
      console.log(
        `ℹ️ PayMongo session ${sessionId} status: ${paymongoStatus} — not activating.`,
      );
      return new Response(
        JSON.stringify({
          status: paymongoStatus || "unknown",
          paid: false,
          message: "Payment has not been confirmed by PayMongo yet.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirmed paid by PayMongo. Activate: +1 month stacked from the later of
    // now / current period end.
    const now = new Date();
    const baseEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end)
      : now;
    const periodEnd = new Date(Math.max(now.getTime(), baseEnd.getTime()));
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        subscription_status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        payment_provider: "paymongo",
      })
      .eq("id", subscription.id);

    if (updateError) throw updateError;

    // Create the payment history record ONLY now that PayMongo has confirmed
    // the charge. This is the single source of truth.
    const { error: paymentInsertError } = await supabase
      .from("payments")
      .insert({
        hotel_id: hotelId,
        subscription_id: subscription.id,
        paymongo_session_id: sessionId,
        amount: subscription.monthly_amount,
        currency: "PHP",
        status: "paid",
        paid_at: now.toISOString(),
        payment_method: paymentMethod || "paymongo",
      });

    if (paymentInsertError) throw paymentInsertError;

    console.log(
      `✅ Subscription activated via verify-payment for hotel: ${hotelId}`,
    );

    return new Response(JSON.stringify({ status: "active", paid: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
