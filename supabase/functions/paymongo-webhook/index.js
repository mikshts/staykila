// supabase/functions/paymongo-webhook/index.js
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Verify webhook signature (recommended for production)
  // const signature = req.headers.get('paymongo-signature');
  // Verify using the webhook secret

  const payload = await req.json();
  const event = payload.data;

  // ✅ FIX: Use the correct event name
  if (event.attributes.type === "checkout_session.payment.paid") {
    const sessionId = event.attributes.data.id;
    const metadata = event.attributes.data.attributes.metadata;

    // Update subscription status to active
    const { error } = await supabase
      .from("subscriptions")
      .update({
        subscription_status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        payment_provider: "paymongo",
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", sessionId);

    if (error) {
      console.error("Webhook update error:", error);
      return new Response("Error updating subscription", { status: 500 });
    }

    console.log(`✅ Subscription activated for session: ${sessionId}`);
  }

  return new Response("OK", { status: 200 });
});
