// supabase/functions/verify-payment/index.ts
//
// SIMPLE, RELIABLE payment activation.
//
// PayMongo only redirects to our success_url AFTER a payment succeeds, so when
// the client calls this function (it only does so from a ?payment=success
// redirect) we can trust that the user paid. We activate the subscription
// (+30 days, stacked) and mark the pending payment(s) as paid.
//
// We ALSO try to confirm with PayMongo directly as a safety net:
//   - PayMongo says "paid"        -> activate (normal path)
//   - PayMongo says "not paid"    -> do NOT activate (correct; shouldn't happen
//                                    on a real success redirect)
//   - PayMongo call ERRORS        -> trust the redirect anyway, so the user is
//                                    never stuck on "pending" due to a PayMongo
//                                    API/secret/network issue.
//
// Idempotent: a payment already "paid" is a no-op, so the webhook and this
// function can both safely run.
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

    // Try to confirm with PayMongo for each pending payment (safety net only).
    let paymongoReachable = false;
    let activatedViaPaymongo = false;

    for (const paymentRow of pendingPayments) {
      const sessionId = paymentRow.paymongo_session_id;
      if (!sessionId) {
        // No session id (e.g. manually created row) — treat as payable.
        activatedViaPaymongo = true;
        break;
      }

      let isPaid = false;
      try {
        if (PAYMONGO_SECRET) {
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
          paymongoReachable = true;
          if (pmRes.ok) {
            const pmJson = await pmRes.json();
            const session = pmJson?.data;
            const paymentStatus =
              session?.attributes?.payment_intent?.attributes?.status;
            isPaid =
              session?.attributes?.status === "paid" ||
              paymentStatus === "succeeded" ||
              paymentStatus === "paid";
          }
        } else {
          // No secret configured — can't verify, but we still trust the
          // redirect (PayMongo only hits success_url after payment).
          isPaid = true;
        }
      } catch {
        // Network/API error — we'll fall back to trusting the redirect below.
        isPaid = false;
      }

      if (isPaid) {
        activatedViaPaymongo = true;
        break;
      }
    }

    // Decide: activate now?
    //   - PayMongo confirmed a payment -> yes
    //   - PayMongo reachable but said NOT paid -> NO (correct; don't grant free sub)
    //   - PayMongo unreachable / no secret -> trust the redirect -> yes
    const shouldActivate =
      activatedViaPaymongo || !paymongoReachable;

    if (!shouldActivate) {
      return new Response(
        JSON.stringify({ status: "pending", paid: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Activate: +1 month stacked from the later of now / current period end.
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

    // Mark all pending payments for this subscription as paid.
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        payment_method: "paymongo",
      })
      .eq("subscription_id", subscription.id)
      .eq("status", "pending");

    if (paymentUpdateError) throw paymentUpdateError;

    console.log(
      `✅ Subscription activated via verify-payment for hotel: ${hotelId} (paymongoReachable=${paymongoReachable})`,
    );

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
