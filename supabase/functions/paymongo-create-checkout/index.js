// supabase/functions/paymongo-create-checkout/index.js
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMONGO_SECRET = Deno.env.get("PAYMONGO_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    const { roomCount, hotelId, successUrl, cancelUrl } = await req.json();

    // Calculate amount (in centavos)
    const pricePerRoom = 1499;
    const monthlyTotal = roomCount * pricePerRoom;
    const amount = monthlyTotal * 100;

    const response = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(PAYMONGO_SECRET + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            attributes: {
              send_email_receipt: false,
              show_description: true,
              show_line_items: true,
              line_items: [
                {
                  currency: "PHP",
                  amount: amount,
                  description: `StayKila Subscription – ${roomCount} rooms`,
                  name: `Monthly Subscription (${roomCount} rooms)`,
                  quantity: 1,
                },
              ],
              payment_method_types: ["card", "gcash", "paymaya"],
              success_url: successUrl,
              cancel_url: cancelUrl,
              metadata: {
                hotel_id: hotelId,
                room_count: roomCount,
              },
            },
          },
        }),
      },
    );

    const result = await response.json();
    if (!response.ok)
      throw new Error(result.errors?.[0]?.detail || "PayMongo error");

    const checkoutUrl = result.data.attributes.checkout_url;
    const sessionId = result.data.id;

    // Update subscription record with provider_subscription_id
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ provider_subscription_id: sessionId })
      .eq("hotel_id", hotelId);

    if (updateError)
      console.error("Error updating provider_subscription_id:", updateError);

    return new Response(JSON.stringify({ checkoutUrl, sessionId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
