// supabase/functions/paymongo-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get("PAYMONGO_WEBHOOK_SECRET"); // optional

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Optional: verify webhook signature
  // const signature = req.headers.get('paymongo-signature');
  // if (!verifySignature(signature, PAYMONGO_WEBHOOK_SECRET)) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  const payload = await req.json();
  const event = payload.data;

  const eventType = event.attributes.type;

  try {
    if (eventType === "checkout_session.payment.paid") {
      const sessionId = event.attributes.data.id;
      const metadata = event.attributes.data.attributes.metadata;
      const paymentMethod =
        event.attributes.data.attributes.payment_method_types[0]; // assuming one

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

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          subscription_status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          payment_provider: "paymongo",
          // If there was a pending change, apply it
          ...(subscription.pending_change_effective_date &&
          new Date(subscription.pending_change_effective_date) <= now
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
          // receipt_url: event.attributes.data.attributes.receipt_url // if available
        })
        .eq("paymongo_session_id", sessionId);

      if (paymentUpdateError) throw paymentUpdateError;

      // If there is a pending change that was applied, update subscription_change status
      if (subscription.pending_room_count) {
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
