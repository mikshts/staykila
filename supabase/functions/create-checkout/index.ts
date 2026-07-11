import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMONGO_SECRET = Deno.env.get("PAYMONGO_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PRICE_PER_ROOM = 1499;

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
    // Fail fast with a clear message if the function is misconfigured.
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

    const { hotelId, roomCount, successUrl, cancelUrl } = await req.json();

    if (!hotelId || !successUrl || !cancelUrl) {
      throw new Error("Missing required fields: hotelId, successUrl, cancelUrl.");
    }

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("hotel_id")
      .eq("id", user.id)
      .maybeSingle();

    if (userError || !userData || userData.hotel_id !== hotelId) {
      return new Response(JSON.stringify({ error: "Forbidden: Access denied to this hotel's resources" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Fetch or create subscription for hotel
    let { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (subError) throw subError;

    if (!subscription) {
      // Create a trial subscription (shouldn't happen if setup flow is correct, but fallback)
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      const { data: newSub, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          hotel_id: hotelId,
          room_count: roomCount || 10,
          price_per_room: PRICE_PER_ROOM,
          monthly_amount: (roomCount || 10) * PRICE_PER_ROOM,
          yearly_amount: (roomCount || 10) * PRICE_PER_ROOM * 12,
          currency: "PHP",
          trial_start: new Date().toISOString(),
          trial_end: trialEnd.toISOString(),
          subscription_status: "trial",
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnd.toISOString(),
        })
        .select()
        .single();
      if (insertError) throw insertError;
      subscription = newSub;
    }

    const currentRooms = roomCount || subscription.room_count;
    const monthlyAmount = currentRooms * PRICE_PER_ROOM;
    const amountInCents = monthlyAmount * 100;

    // Create PayMongo checkout session
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
                  amount: amountInCents,
                  description: `StayKila Subscription – ${currentRooms} rooms`,
                  name: `Monthly Subscription (${currentRooms} rooms)`,
                  quantity: 1,
                },
              ],
              payment_method_types: ["card", "gcash", "paymaya"],
              success_url: successUrl,
              cancel_url: cancelUrl,
              metadata: {
                hotel_id: hotelId,
                room_count: currentRooms,
                subscription_id: subscription.id,
              },
            },
          },
        }),
      },
    );

    const result = await response.json();
    if (!response.ok) {
      console.error("PayMongo error:", result);
      throw new Error(result.errors?.[0]?.detail || "PayMongo error");
    }

    const checkoutUrl = result.data.attributes.checkout_url;
    const sessionId = result.data.id;

    // Update subscription with provider_subscription_id
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ provider_subscription_id: sessionId })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("Error updating provider_subscription_id:", updateError);
    }

    // Insert pending payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      hotel_id: hotelId,
      subscription_id: subscription.id,
      paymongo_session_id: sessionId,
      amount: monthlyAmount,
      currency: "PHP",
      status: "pending",
    });

    if (paymentError) {
      console.error("Error inserting payment record:", paymentError);
    }

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
