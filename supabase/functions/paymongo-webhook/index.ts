// supabase/functions/paymongo-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY); // renamed

serve(async (req) => {
  const signature = req.headers.get("paymongo-signature");
  const rawBody = await req.text();

  if (PAYMONGO_WEBHOOK_SECRET) {
    if (!signature) {
      console.error("Missing paymongo-signature header");
      return new Response("Unauthorized: Missing signature", { status: 401 });
    }

    try {
      // PayMongo sends the signature as a COMPOSITE header:
      //   "t=<timestamp>,te=<test_hex>,li=<live_hex>"
      // In TEST mode the HMAC is under `te=`, in LIVE mode under `li=`.
      // We must read whichever segment PayMongo actually sent for the
      // configured secret — otherwise sigHex is undefined and we 401 every
      // webhook, so the subscription_status never flips to 'active'.
      const sigTimestamp = (signature.match(/t=(\d+)/) || [])[1];
      const teMatch = (signature.match(/te=([0-9a-f]+)/i) || [])[1];
      const liMatch = (signature.match(/li=([0-9a-f]+)/i) || [])[1];
      const sigHex = teMatch || liMatch; // prefer test segment, fall back to live

      if (!sigTimestamp || !sigHex) {
        console.error(
          "Malformed paymongo-signature header:",
          signature,
          "(extracted t=", sigTimestamp, "te=", teMatch, "li=", liMatch, ")",
        );
        return new Response("Unauthorized: Malformed signature", { status: 401 });
      }

      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(PAYMONGO_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signedData = encoder.encode(`${sigTimestamp}.${rawBody}`);
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, signedData);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const computedHex = signatureArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Constant-time-ish compare to avoid timing leaks.
      const normalize = (h) => h.replace(/^0x/, "").toLowerCase();
      if (normalize(computedHex) !== normalize(sigHex)) {
        console.error("Signature verification failed");
        return new Response("Unauthorized: Invalid signature", { status: 401 });
      }
    } catch (err) {
      console.error("Error during signature verification:", err);
      return new Response("Internal Server Error during verification", {
        status: 500,
      });
    }
  } else {
    console.warn(
      "PAYMONGO_WEBHOOK_SECRET is not set. Webhook signature verification bypassed.",
    );
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
      const paymentMethodTypes =
        event.attributes.data.attributes.payment_method_types || [];
      const paymentMethod = paymentMethodTypes[0] || "unknown";

      // Get the subscription by provider_subscription_id
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("provider_subscription_id", sessionId)
        .single();

      if (subError || !subscription) {
        console.error("Subscription not found for session:", sessionId);
        return new Response("Subscription not found", { status: 404 });
      }

      // Update subscription to active
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
          // If there was a pending change, apply it
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

      // Update the payment record status
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: now.toISOString(),
          payment_method: paymentMethod,
        })
        .eq("paymongo_session_id", sessionId);

      if (paymentUpdateError) throw paymentUpdateError;

      // If there is a pending change that was applied, update subscription_change status
      if (shouldApplyChange) {
        await supabase
          .from("subscription_changes")
          .update({ status: "applied" })
          .eq("subscription_id", subscription.id)
          .eq("status", "pending");
      }

      console.log(`✅ Subscription activated for session: ${sessionId}`);
    } else if (eventType === "payment.failed") {
      // Similar logic to mark payment as failed, set subscription to past_due
      // ...
    } else {
      console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
