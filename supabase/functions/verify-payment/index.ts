// supabase/functions/verify-payment/index.ts
//
// Self-healing payment verifier. After a successful PayMongo checkout redirect,
// the client calls this function so the subscription/payment can be activated
// EVEN IF the PayMongo webhook is delayed, misconfigured, or fails signature
// verification.
//
// KEY DESIGN: we do NOT rely on the client passing the correct checkout
// session id (that value is easily lost — PayMongo doesn't always append it to
// the redirect, and sessionStorage can be cleared). Instead we look up the
// hotel's subscription and verify EVERY pending payment row against PayMongo.
// Whichever session the user actually paid gets activated. This makes the
// post-payment flow fully automatic — no manual "Verify" click required.
//
// Idempotent: a session whose payment is already "paid" is a no-op, so the
// webhook and this function can both safely run.
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

    const { hotelId } = await req.json();

    if (!hotelId) {
      throw new Error("Missing required field: hotelId.");
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

    // Already active and no pending payments? Nothing to do.
    const { data: pendingPayments, error: pendErr } = await supabase
      .from("payments")
      .select("*")
      .eq("subscription_id", subscription.id)
      .eq("status", "pending");

    if (pendErr) throw pendErr;

    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(
        JSON.stringify({
          status: subscription.subscription_status,
          paid: subscription.subscription_status === "active",
          nothingToVerify: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify each pending payment directly with PayMongo. Activate the first
    // one that has actually been paid.
    for (const paymentRow of pendingPayments) {
      const sessionId = paymentRow.paymongo_session_id;
      if (!sessionId) continue;

      let isPaid = false;
      let paymentMethod = "unknown";
      try {
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
        if (!pmRes.ok) continue; // skip sessions we can't inspect
        const pmJson = await pmRes.json();
        const session = pmJson?.data;
        const paymentStatus =
          session?.attributes?.payment_intent?.attributes?.status;
        isPaid =
          session?.attributes?.status === "paid" ||
          paymentStatus === "succeeded" ||
          paymentStatus === "paid";
        const paymentMethodTypes =
          session?.attributes?.payment_method_types || [];
        paymentMethod = paymentMethodTypes[0] || "unknown";
      } catch {
        continue; // network blip — try the next pending session
      }

      if (!isPaid) continue;

      // This session was paid — activate the subscription (+1 month, stacked)
      // and mark this payment paid.
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

      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: now.toISOString(),
          payment_method: paymentMethod,
        })
        .eq("id", paymentRow.id);

      if (paymentUpdateError) throw paymentUpdateError;

      console.log(
        `✅ Subscription extended via verify-payment for session: ${sessionId}`,
      );

      return new Response(
        JSON.stringify({ status: "active", paid: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // None of the pending sessions have been paid (yet). Leave them pending.
    return new Response(
      JSON.stringify({ status: "pending", paid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
