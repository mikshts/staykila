// supabase/functions/verify-payment/index.ts
//
// Self-healing payment verifier. After a successful PayMongo checkout redirect,
// the client calls this function so the subscription/payment can be activated
// EVEN IF the PayMongo webhook is delayed, misconfigured, or fails signature
// verification. It is fully idempotent: calling it repeatedly for an already
// active subscription is a no-op.
//
// This is the same activation logic the webhook performs, kept in sync with
// supabase/functions/paymongo-webhook/index.ts.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMONGO_SECRET = Deno.env.get("PAYMONGO_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY"); // renamed

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    if (!PAYMONGO_SECRET) {
      throw new Error(
        "Server configuration error: PAYMONGO_SECRET_KEY is not set.",
      );
    }

    const { hotelId, sessionId } = await req.json();

    if (!hotelId || !sessionId) {
      throw new Error("Missing required fields: hotelId, sessionId.");
    }

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

    // 1. Ask PayMongo directly whether this checkout session was paid.
    const pmRes = await fetch(
      `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(PAYMONGO_SECRET + ":")}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!pmRes.ok) {
      const errBody = await pmRes.json().catch(() => ({}));
      console.error("PayMongo lookup failed:", errBody);
      throw new Error(
        errBody?.errors?.[0]?.detail || "Failed to verify payment with PayMongo.",
      );
    }

    const pmJson = await pmRes.json();
    const session = pmJson?.data;
    const paymentStatus = session?.attributes?.payment_intent?.attributes?.status;
    const isPaid =
      session?.attributes?.status === "paid" ||
      paymentStatus === "succeeded" ||
      paymentStatus === "paid";

    if (!isPaid) {
      // Not paid yet — let the client keep polling. Don't mutate anything.
      return new Response(
        JSON.stringify({ status: "pending", paid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const paymentMethodTypes =
      session?.attributes?.payment_method_types || [];
    const paymentMethod = paymentMethodTypes[0] || "unknown";

    // 2. Load the subscription tied to this session.
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("provider_subscription_id", sessionId)
      .maybeSingle();

    if (subError) throw subError;
    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found for session." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Already active? Idempotent no-op.
    if (subscription.subscription_status === "active") {
      return new Response(
        JSON.stringify({ status: "active", paid: true, alreadyActive: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Activate the subscription (mirrors the webhook logic).
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + 30);

    const shouldApplyChange =
      subscription.pending_change_effective_date &&
      new Date(subscription.pending_change_effective_date) <= now;

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        subscription_status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        payment_provider: "paymongo",
        ...(shouldApplyChange
          ? {
              room_count: subscription.pending_room_count,
              monthly_amount: subscription.pending_monthly_amount,
              pending_room_count: null,
              pending_monthly_amount: null,
              pending_change_effective_date: null,
            }
          : {}),
      })
      .eq("id", subscription.id);

    if (updateError) throw updateError;

    // 4. Mark the payment record as paid.
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        payment_method: paymentMethod,
      })
      .eq("paymongo_session_id", sessionId);

    if (paymentUpdateError) throw paymentUpdateError;

    // 5. If a pending change was applied, mark it applied.
    if (shouldApplyChange) {
      await supabase
        .from("subscription_changes")
        .update({ status: "applied" })
        .eq("subscription_id", subscription.id)
        .eq("status", "pending");
    }

    console.log(`✅ Subscription activated via verify-payment for session: ${sessionId}`);

    return new Response(
      JSON.stringify({ status: "active", paid: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
