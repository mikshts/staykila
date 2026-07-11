import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { hotelId, newRoomCount } = await req.json();

    console.log("📥 Received change-room-count request:", {
      hotelId,
      newRoomCount,
    });

    // Validate inputs
    if (!hotelId) {
      throw new Error("hotelId is required");
    }
    if (!newRoomCount || newRoomCount < 1 || newRoomCount > 300) {
      throw new Error("Invalid room count. Must be between 1 and 300.");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY); // renamed

    // Fetch current subscription
    console.log("🔍 Fetching subscription for hotel:", hotelId);
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (subError) {
      console.error("❌ Subscription fetch error:", subError);
      throw new Error("Database error while fetching subscription");
    }

    if (!subscription) {
      console.error("❌ No subscription found for hotel:", hotelId);
      throw new Error("No active subscription found for this hotel");
    }

    console.log("✅ Current subscription:", subscription);

    const oldAmount = subscription.monthly_amount;
    const newAmount = newRoomCount * PRICE_PER_ROOM;

    // Determine effective date
    let effectiveDate;
    if (subscription.subscription_status === "trial") {
      effectiveDate = new Date(subscription.trial_end);
      console.log("📅 Effective date (trial):", effectiveDate);
    } else if (subscription.subscription_status === "active") {
      effectiveDate = new Date(subscription.current_period_end);
      console.log("📅 Effective date (active):", effectiveDate);
    } else {
      throw new Error(
        `Cannot change plan in status: ${subscription.subscription_status}`,
      );
    }

    // Ensure effectiveDate is valid
    if (!effectiveDate || isNaN(effectiveDate.getTime())) {
      throw new Error("Invalid effective date from subscription");
    }

    // Insert subscription_change record
    console.log("📝 Creating subscription_change record...");
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

    if (changeError) {
      console.error("❌ Failed to insert subscription_change:", changeError);
      throw new Error("Failed to schedule plan change: " + changeError.message);
    }

    console.log("✅ subscription_change inserted:", change);

    // Update subscription with pending info
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        pending_room_count: newRoomCount,
        pending_monthly_amount: newAmount,
        pending_change_effective_date: effectiveDate.toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) {
      console.error(
        "❌ Failed to update subscription pending fields:",
        updateError,
      );
      throw new Error("Failed to update subscription: " + updateError.message);
    }

    console.log("✅ Subscription pending fields updated");

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
    console.error("🔥 change-room-count error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
