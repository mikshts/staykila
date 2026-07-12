// supabase/functions/verify-payment/index.ts
//
// Self-healing payment verifier. After a successful PayMongo checkout redirect,
// the client calls this function so the subscription/payment can be activated
// EVEN IF the PayMongo webhook is delayed, misconfigured, or fails signature
// verification. It is fully idempotent: calling it repeatedly for an already
// paid session is a no-op.
//
// IMPORTANT: we locate the record to activate via the payments row keyed by
// `paymongo_session_id` (which create-checkout inserts for EVERY checkout),
// NOT via subscriptions.provider_subscription_id. The latter is a single column
// that gets overwritten on each new checkout, so relying on it is what caused
// renewals (and post-manual-expiry payments) to silently stay "pending" and the
// dashboard to stay locked.
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

    // 1. Find the payment row for this checkout session. This is the reliable
    //    link — create-checkout inserts one per session, so it always exists
    //    for a payment we initiated.
    const { data: paymentRow, error: payLookupErr } = await supabase
      .from("payments")
      .select("*")
      .eq("paymongo_session_id", sessionId)
      .maybeSingle();

    if (payLookupErr) throw payLookupErr;
    if (!paymentRow) {
      return new Response(
        JSON.stringify({ error: "Payment not found for session." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // Idempotency guard: if this session's payment is already paid, we've
    // already added its month — do NOT extend again. This keeps the webhook and
    // the client verifier from double-counting.
    if (paymentRow.status === "paid") {
      return new Response(
        JSON.stringify({
          status: "active",
          paid: true,
          alreadyApplied: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Ask PayMongo directly whether this checkout session was paid.
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

    // 3. Load the subscription this payment belongs to.
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", paymentRow.subscription_id)
      .maybeSingle();

    if (subError) throw subError;
    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found for payment." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    // 4. Add one month to the subscription. Stack from the later of "now" and
    //    the current period end so an early renewal doesn't lose remaining days.
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

    // 5. Mark the payment record as paid.
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        payment_method: paymentMethod,
      })
      .eq("paymongo_session_id", sessionId);

    if (paymentUpdateError) throw paymentUpdateError;

    console.log(`✅ Subscription extended via verify-payment for session: ${sessionId}`);

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
