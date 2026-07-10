// supabase/functions/change-room-count/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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
    const { hotelId, newRoomCount } = await req.json();

    if (!hotelId || !newRoomCount || newRoomCount < 1 || newRoomCount > 300) {
      throw new Error("Invalid room count");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch current subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (subError || !subscription) {
      throw new Error("Subscription not found");
    }

    const oldAmount = subscription.monthly_amount;
    const newAmount = newRoomCount * PRICE_PER_ROOM;

    // Determine effective date
    let effectiveDate;
    if (subscription.subscription_status === "trial") {
      // Changes during trial take effect at the end of trial
      effectiveDate = new Date(subscription.trial_end);
    } else if (subscription.subscription_status === "active") {
      // Changes take effect at next billing period
      effectiveDate = new Date(subscription.current_period_end);
    } else {
      throw new Error("Cannot change plan in current status");
    }

    // Insert subscription_change record
    const { data: change, error: changeError } = await supabase
      .from("subscription_changes")
      .insert({
        hotel_id: hotelId,
        subscription_id: subscription.id,
        old_room_count: subscription.room_count,
        new_room_count: newRoomCount,
        old_amount: oldAmount,
        new_amount: newAmount,
        effective_date: effectiveDate.toISOString(),
        status: "pending",
      })
      .select()
      .single();

    if (changeError) throw changeError;

    // Update subscription with pending info
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        pending_room_count: newRoomCount,
        pending_monthly_amount: newAmount,
        pending_change_effective_date: effectiveDate.toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        newAmount,
        effectiveDate: effectiveDate.toISOString(),
        changeId: change.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
