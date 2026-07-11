# Turnover: Billing "Renew" / "Database error while fetching subscription" fix

> Date: 2026-07-11
> Project: StayKila (React 18 + Vite 4, Supabase Edge Functions on Deno, PayMongo payments)
> Status: **Code fixes complete & saved locally. Edge functions deployed by user on 2026-07-11.
> Frontend (BillingPage.jsx) fix still needs a frontend rebuild/deploy (e.g. Vercel).
> Git NOT yet pushed (agent terminal was non-functional this session).**

## 1. The reported symptoms

User clicks **Renew Now** on the billing page (shown after trial/subscription expired):
```
POST https://kdfhreavgdbuhqvecfeg.supabase.co/functions/v1/create-checkout 400 (Bad Request)
```
User also reported a toast: **"Database error while fetching subscription"** after clicking
Renew / Manage Plan actions.

## 2. Root cause (confirmed via schema + code scan)

Both errors are the **same underlying bug**: the edge functions were not using the
service-role key, so they ran as the **anon** role, and the `subscriptions` / `payments`
tables have **RLS enabled** with policies scoped to `authenticated` only (see schema
below). → `permission denied for table subscriptions` → surfaced as a 400.

The wrong env var name was the trigger:
```ts
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY"); // WRONG — undefined
```
Supabase auto-injects the service-role key as **`SUPABASE_SERVICE_ROLE_KEY`**, not
`SERVICE_ROLE_KEY`. With `SERVICE_ROLE_KEY` undefined, `createClient` silently fell back
to the anon role → RLS blocked the query.

### Where each symptom comes from
| Symptom | Source | Trigger |
| --- | --- | --- |
| Console `create-checkout 400` | deployed `create-checkout` (old code) | **Renew Now** button |
| Toast **"Database error while fetching subscription"** | `change-room-count/index.ts` line 79 | **Manage Plan → Save Changes** button (same RLS cause) |
| `cancel-subscription` would fail identically | deployed `cancel-subscription` (old code) | Cancel button |

The string `"Database error while fetching subscription"` exists ONLY in
`change-room-count/index.ts` (confirmed by grep) — it is NOT in `create-checkout` and NOT
in any frontend file. So that toast is from the Manage Plan flow, not Renew.

### Relevant schema (RLS on subscriptions/payments)
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own hotel's subscription" ON subscriptions FOR SELECT
  TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM users WHERE id = auth.uid()));
-- ... INSERT/UPDATE policies also TO authenticated only. No anon policy.
```
Because the edge function must bypass RLS (the client sends the anon key, not a user JWT,
so `auth.uid()` would be null and RLS would block it anyway), the function MUST use the
service-role key. That is the correct and necessary approach here.

## 3. Changes made (all saved on disk)

### Edge functions (4) — `SERVICE_ROLE_KEY` env-name fix + JWT ownership check
All four now resolve the key correctly (and the user already pasted/deployed these):
```ts
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY"); // renamed
```
`create-checkout`, `cancel-subscription`, and `change-room-count` also gained a JWT
auth + ownership check (read `Authorization` header, `supabase.auth.getUser`, verify
`users.hotel_id === hotelId`) — this closes the IDOR noted in `docs/CODEBASE_AUDIT.md` #1.
`paymongo-webhook` gained HMAC signature verification (closes audit #2).

### Frontend `src/components/billing/BillingPage.jsx`
- `handleSubscribe` now sends the user's JWT (`supabase.auth.getSession().access_token`)
  instead of only the anon key, and **checks `response.ok` + reads `data.error`**, showing
  the real message in the toast (no more silent failure).
- `handleCancel` similarly surfaces the real error.
- NOTE: this is a **frontend (client bundle)** change. It must be rebuilt/deployed
  (Vercel) — deploying edge functions does NOT ship this fix.

### Frontend `src/components/dashboard/SubscriptionManager.jsx`
- Was posting to `/functions/v1/paymongo-create-checkout` (does not exist) → 404. Fixed to
  `create-checkout`. Added same error-surfacing logic. (Audit #6.)

## 4. IMPORTANT — what still needs to happen

- **Frontend deploy**: The `BillingPage.jsx` / `SubscriptionManager.jsx` fixes are in the
  client bundle. After pulling these changes, **rebuild and redeploy the frontend**
  (e.g. `vercel --prod` or your CI). Until then the old silent-failure behavior remains in
  production even though the edge functions are fixed.
- **Git push**: NOT done (agent terminal non-functional). User must push manually.
- **Secrets**: Ensure these Edge Function secrets exist (Dashboard → Edge Functions →
  Secrets, or Project Settings → API):
  - `SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase, but set explicitly to be safe)
  - `PAYMONGO_SECRET_KEY` (required; if missing the function throws a clear config error)
  - `PAYMONGO_WEBHOOK_SECRET` (optional; webhook verification is skipped if unset)

## 5. Exact commands

From `C:\Users\Lenovo\staykila`:

### Push source (does NOT fix runtime; frontend must also be redeployed):
```sh
git add src/components/billing/BillingPage.jsx \
        src/components/dashboard/SubscriptionManager.jsx \
        supabase/functions/create-checkout/index.ts \
        supabase/functions/cancel-subscription/index.ts \
        supabase/functions/change-room-count/index.ts \
        supabase/functions/paymongo-webhook/index.ts
git commit -m "Fix edge function service-role key env name, add JWT ownership check, surface billing errors"
git push
```

### Deploy edge functions (CLI; requires Docker running):
```sh
supabase functions deploy create-checkout --project-ref kdfhreavgdbuhqvecfeg
supabase functions deploy cancel-subscription --project-ref kdfhreavgdbuhqvecfeg
supabase functions deploy change-room-count --project-ref kdfhreavgdbuhqvecfeg
supabase functions deploy paymongo-webhook --project-ref kdfhreavgdbuhqvecfeg
```
(If Docker can't run, paste the function code into the Dashboard editor and click Deploy —
no Docker needed. The user already did this for the 4 functions.)

### Redeploy frontend (Vercel example):
```sh
vercel --prod
```

## 6. How to verify the fix landed

After deploying edge functions + frontend:
- **Renew Now** → redirects to PayMongo checkout. If instead a toast says
  `Server configuration error: PAYMONGO_SECRET_KEY is not set.`, add that secret.
- **Manage Plan → Save Changes** → no longer shows "Database error while fetching
  subscription".
- Still `permission denied` → the deployed function code did NOT contain the two-line
  `SERVICE_ROLE_KEY` block; re-paste and redeploy.

## 7. Full corrected edge-function code (for reference / re-deploy)

### `create-checkout/index.ts`
```ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYMONGO_SECRET = Deno.env.get("PAYMONGO_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PRICE_PER_ROOM = 59;

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

    let { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (subError) throw subError;

    if (!subscription) {
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

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({ provider_subscription_id: sessionId })
      .eq("id", subscription.id);

    if (updateError) console.error("Error updating provider_subscription_id:", updateError);

    const { error: paymentError } = await supabase.from("payments").insert({
      hotel_id: hotelId,
      subscription_id: subscription.id,
      paymongo_session_id: sessionId,
      amount: monthlyAmount,
      currency: "PHP",
      status: "pending",
    });

    if (paymentError) console.error("Error inserting payment record:", paymentError);

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
```

### `cancel-subscription/index.ts`
```ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY"); // renamed

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
    const { hotelId } = await req.json();

    if (!hotelId) throw new Error("hotelId required");

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

    const { error } = await supabase
      .from("subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("hotel_id", hotelId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
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
```

### `change-room-count/index.ts`
```ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PRICE_PER_ROOM = 59;

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

    if (!hotelId) throw new Error("hotelId is required");
    if (!newRoomCount || newRoomCount < 1 || newRoomCount > 300) {
      throw new Error("Invalid room count. Must be between 1 and 300.");
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

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("hotel_id", hotelId)
      .maybeSingle();

    if (subError) {
      console.error("Subscription fetch error:", subError);
      throw new Error("Database error while fetching subscription");
    }

    if (!subscription) {
      throw new Error("No active subscription found for this hotel");
    }

    const oldAmount = subscription.monthly_amount;
    const newAmount = newRoomCount * PRICE_PER_ROOM;

    let effectiveDate;
    if (subscription.subscription_status === "trial") {
      effectiveDate = new Date(subscription.trial_end);
    } else if (subscription.subscription_status === "active") {
      effectiveDate = new Date(subscription.current_period_end);
    } else {
      throw new Error(`Cannot change plan in status: ${subscription.subscription_status}`);
    }

    if (!effectiveDate || isNaN(effectiveDate.getTime())) {
      throw new Error("Invalid effective date from subscription");
    }

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

    if (changeError) throw new Error("Failed to schedule plan change: " + changeError.message);

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        pending_room_count: newRoomCount,
        pending_monthly_amount: newAmount,
        pending_change_effective_date: effectiveDate.toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) throw new Error("Failed to update subscription: " + updateError.message);

    return new Response(
      JSON.stringify({ success: true, newAmount, effectiveDate: effectiveDate.toISOString(), changeId: change.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("change-room-count error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
```

### `paymongo-webhook/index.ts`
```ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY"); // renamed
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async (req) => {
  const signature = req.headers.get("paymongo-signature");
  const rawBody = await req.text();

  if (PAYMONGO_WEBHOOK_SECRET) {
    if (!signature) {
      console.error("Missing paymongo-signature header");
      return new Response("Unauthorized: Missing signature", { status: 401 });
    }
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw", encoder.encode(PAYMONGO_WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
      );
      const rawBodyBuffer = encoder.encode(rawBody);
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, rawBodyBuffer);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const computedHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");
      if (computedHex !== signature) {
        console.error("Signature verification failed");
        return new Response("Unauthorized: Invalid signature", { status: 401 });
      }
    } catch (err) {
      console.error("Error during signature verification:", err);
      return new Response("Internal Server Error during verification", { status: 500 });
    }
  } else {
    console.warn("PAYMONGO_WEBHOOK_SECRET is not set. Webhook signature verification bypassed.");
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return new Response("Bad Request", { status: 400 });
  }

  const event = payload.data;
  const eventType = event.attributes.type;

  try {
    if (eventType === "checkout_session.payment.paid") {
      const sessionId = event.attributes.data.id;
      const paymentMethod = event.attributes.data.attributes.payment_method_types[0];

      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("provider_subscription_id", sessionId)
        .single();

      if (subError || !subscription) {
        console.error("Subscription not found for session:", sessionId);
        return new Response("Subscription not found", { status: 404 });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      const shouldApplyChange = subscription.pending_change_effective_date &&
        new Date(subscription.pending_change_effective_date) <= now;

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          subscription_status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_billing_date: periodEnd.toISOString(),
          payment_provider: "paymongo",
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

      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({ status: "paid", paid_at: now.toISOString(), payment_method: paymentMethod })
        .eq("paymongo_session_id", sessionId);

      if (paymentUpdateError) throw paymentUpdateError;

      if (shouldApplyChange) {
        await supabase
          .from("subscription_changes")
          .update({ status: "applied" })
          .eq("subscription_id", subscription.id)
          .eq("status", "pending");
      }

      console.log(`Subscription activated for session: ${sessionId}`);
    }
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
```

## 8. Follow-ups (from docs/CODEBASE_AUDIT.md)

- #3: No SQL migrations / RLS in repo as managed files — schema is applied manually.
- #4: WiFi password cached in localStorage (GuestPortal) — security risk.
- #5: Expired-user redirect loop on /billing — verify ProtectedRoute guard still holds.
- #7: AuthCallback uses `.single()` on users — can misroute new Google users.
- #8: webhook marks subscription_changes "applied" only inside the apply branch (now fixed
  in the code above — good).

## 9. Key references

| Concern | File |
| --- | --- |
| Edge function (checkout) | `supabase/functions/create-checkout/index.ts` |
| Edge function (webhook) | `supabase/functions/paymongo-webhook/index.ts` |
| Edge function (cancel) | `supabase/functions/cancel-subscription/index.ts` |
| Edge function (room count) | `supabase/functions/change-room-count/index.ts` |
| Billing page (frontend) | `src/components/billing/BillingPage.jsx` |
| Dashboard subscribe | `src/components/dashboard/SubscriptionManager.jsx` |
| Audit | `docs/CODEBASE_AUDIT.md` |
| Supabase project ref | `kdfhreavgdbuhqvecfeg` |
