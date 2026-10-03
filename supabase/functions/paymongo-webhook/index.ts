// supabase/functions/paymongo-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addOneCalendarMonth } from "../_shared/subscriptionPeriod.ts";
import { verifyPayMongoWebhookSignature } from "../_shared/paymongoWebhookSignature.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY); // renamed

serve(async (req) => {
  const signature = req.headers.get("paymongo-signature");
  const rawBody = await req.text();

  if (!PAYMONGO_WEBHOOK_SECRET) {
    console.error("PAYMONGO_WEBHOOK_SECRET is not configured");
    return new Response("Webhook verification is not configured", {
      status: 500,
    });
  }
  if (!signature) {
    return new Response("Unauthorized: Missing signature", { status: 401 });
  }

  try {
    const validSignature = await verifyPayMongoWebhookSignature(
      rawBody,
      PAYMONGO_WEBHOOK_SECRET,
      signature,
    );
    if (!validSignature) {
      return new Response("Unauthorized: Invalid signature", { status: 401 });
    }
  } catch (err) {
    console.error("Error during signature verification:", err);
    return new Response("Internal Server Error during verification", {
      status: 500,
    });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("Failed to parse request body as JSON:", err);
    return new Response("Bad Request", { status: 400 });
  }

  const event = payload.data;
  const eventType = event.attributes.type;

  try {
    if (eventType === "checkout_session.payment.paid") {
      const sessionId = event.attributes.data.id;
      const sessionAttributes = event.attributes.data.attributes || {};
      const paymentMethodTypes = sessionAttributes.payment_method_types || [];
      const paidPayment = (sessionAttributes.payments || []).find(
        (payment) => payment?.attributes?.status === "paid",
      );
      const paymentMethod =
        paidPayment?.attributes?.source?.type ||
        sessionAttributes.payment_method_used ||
        paymentMethodTypes[0] ||
        "unknown";

      // Locate the subscription for this checkout session via
      // provider_subscription_id (set by create-checkout). This is the
      // reliable link — unlike payments rows, which are no longer created
      // up-front, the subscription always carries the latest session id.
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("provider_subscription_id", sessionId)
        .maybeSingle();

      if (subError) throw subError;
      if (!subscription) {
        console.error("Subscription not found for session:", sessionId);
        return new Response("Subscription not found", { status: 404 });
      }

      // Idempotency guard: if this checkout session already has a paid
      // payment row, we've already added its month — do NOT extend again.
      // This keeps the webhook and the verify-payment function from
      // double-counting.
      const { data: existingPaid, error: paidLookupErr } = await supabase
        .from("payments")
        .select("id")
        .eq("paymongo_session_id", sessionId)
        .eq("status", "paid")
        .maybeSingle();

      if (paidLookupErr) throw paidLookupErr;
      if (existingPaid) {
        console.log(`ℹ️ Payment already applied for session: ${sessionId}`);
        return new Response("OK", { status: 200 });
      }

      // Add one month to the subscription. Stack from the later of "now" and
      // the current period end so an early renewal doesn't lose remaining days.
      const now = new Date();
      const baseEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : now;
      const renewalBase = new Date(Math.max(now.getTime(), baseEnd.getTime()));
      const periodEnd = addOneCalendarMonth(renewalBase);

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

      // Create the payment history record ONLY now that PayMongo has
      // confirmed the charge. This is the single source of truth.
      const { error: paymentInsertError } = await supabase
        .from("payments")
        .insert({
          hotel_id: subscription.hotel_id,
          subscription_id: subscription.id,
          paymongo_session_id: sessionId,
          amount: subscription.monthly_amount,
          currency: "PHP",
          status: "paid",
          paid_at: now.toISOString(),
          payment_method: paymentMethod,
        });

      if (paymentInsertError) throw paymentInsertError;

      console.log(`✅ Subscription extended for session: ${sessionId}`);
    } else if (eventType === "checkout_session.payment.failed") {
      // Mark the checkout session as failed so the UI can show a clear
      // failure state. No subscription change is made.
      const sessionId = event.attributes.data.id;
      await supabase
        .from("subscriptions")
        .update({ provider_subscription_id: null })
        .eq("provider_subscription_id", sessionId);
      console.log(`ℹ️ Checkout session failed: ${sessionId}`);
    } else if (eventType === "checkout_session.expired") {
      const sessionId = event.attributes.data.id;
      await supabase
        .from("subscriptions")
        .update({ provider_subscription_id: null })
        .eq("provider_subscription_id", sessionId);
      console.log(`ℹ️ Checkout session expired: ${sessionId}`);
    } else {
      console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
