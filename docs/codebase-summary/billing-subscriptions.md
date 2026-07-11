# Billing & Subscriptions

## Overview

StayKila bills hotels a **monthly subscription priced per room** (₱59/room/mo
by default). Billing is powered by **PayMongo** and orchestrated by **Deno edge
functions** that use the Supabase **service-role** key. The React client never
holds the service-role key; it calls the edge functions over HTTPS using the
anon key in the `Authorization` header.

## Files

- `src/components/billing/BillingPage.jsx` — plan summary, subscribe, cancel,
  payment history.
- `src/components/billing/ManagePlan.jsx` — change room count (calls
  `change-room-count`).
- `src/components/billing/BillingCard.jsx`, `TrialBanner.jsx` — UI pieces.
- `src/hooks/useSubscription.js` — subscription state + derived flags.
- `src/hooks/usePayments.js` — payment history.
- `src/lib/pricing.js` — `PRICE_PER_ROOM = 59` and price helpers.
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/cancel-subscription/index.ts`
- `supabase/functions/change-room-count/index.ts`
- `supabase/functions/paymongo-webhook/index.ts`

## Pricing model

Defined in `src/lib/pricing.js` (`PRICING_CONFIG`):

- `pricePerRoom: 59` (₱/room/month)
- `currency: "₱"`, `currencyCode: "PHP"`
- `trialDays: 30`
- `minRooms: 1`, `maxRooms: 300`

Helpers: `calculateMonthlyPrice`, `calculateYearlyPrice`, `formatPrice`,
`getPricingBreakdown`.

> ⚠️ The magic number `30` is hardcoded in **three** places: `lib/pricing.js`,
> `create-checkout/index.ts`, and `change-room-count/index.ts`. A price change
> requires editing all three and redeploying the functions. See
> [known-issues.md](./known-issues.md) #12.

## Subscribe flow (`BillingPage.handleSubscribe` → `create-checkout`)

```
Browser (anon key)                  create-checkout (service role)        PayMongo
──────────────────                  ──────────────────────────────        ────────
POST /functions/v1/create-checkout ─▶ fetch/upsert subscriptions row
  { hotelId, roomCount,              create PayMongo checkout_session
    successUrl, cancelUrl }    ───▶  (card/gcash/paymaya, line item =
                                     roomCount * 30)                ───▶ POST api.paymongo.com
                                   ◀── checkout_url + sessionId
  store provider_subscription_id
  insert payments (status=pending)
◀── { checkoutUrl }                  
window.location = checkoutUrl ─────────────────────────────────────────────▶ guest pays
                                                                              webhook fires ↓
```

1. Client posts `{ hotelId, roomCount, successUrl, cancelUrl }` to
   `create-checkout` with the anon key.
2. Edge function fetches/creates the hotel's `subscriptions` row, computes
   `amount = roomCount * 30`, and creates a PayMongo `checkout_sessions`.
3. It stores `provider_subscription_id` on the subscription and inserts a
   `payments` row (`status: "pending"`).
4. Client redirects the browser to `checkout_url`. After payment, PayMongo
   redirects to `successUrl` (`/dashboard?payment=success`).

## Payment confirmation (`paymongo-webhook`)

PayMongo sends events to `paymongo-webhook`. On
`checkout_session.payment.paid`:

1. Look up the subscription by `provider_subscription_id`.
2. Set `subscription_status: "active"`, set `current_period_start/end` (+30d),
   `next_billing_date`, `payment_provider: "paymongo"`.
3. If `pending_change_effective_date <= now`, apply the pending room-count
   change (copy `pending_*` → live fields, clear pending).
4. Mark the matching `payments` row `status: "paid"`, set `paid_at`,
   `payment_method`.
5. If `pending_room_count` is truthy, mark `subscription_changes` rows
   `status: "applied"`.

> ⚠️ Two issues here (see [known-issues.md](./known-issues.md)):
> - **#2** The webhook signature check is **commented out** — anyone can forge a
>   `payment.paid` event and activate any subscription.
> - **#8** The `subscription_changes` "applied" mark runs whenever
>   `pending_room_count` is truthy, even when the effective date is in the
>   future and the change was NOT applied — so future-dated changes can silently
>   never take effect.

## Cancel flow (`BillingPage.handleCancel` → `cancel-subscription`)

1. Client posts `{ hotelId }` to `cancel-subscription` (anon key).
2. Edge function sets `subscriptions.cancel_at_period_end = true`.
3. Client reloads the page to reflect the new state.

## Change room count (`ManagePlan.handleSave` → `change-room-count`)

1. Client posts `{ hotelId, newRoomCount }` to `change-room-count` (anon key).
2. Edge function validates `1..300`, fetches the subscription, and computes an
   `effectiveDate`:
   - `trial` → `trial_end`
   - `active` → `current_period_end`
   - otherwise → rejects.
3. Inserts a `subscription_changes` row (`status: "pending"`) and stores
   `pending_room_count`, `pending_monthly_amount`, `pending_change_effective_date`
   on the subscription.
4. Returns `{ newAmount, effectiveDate }`; the webhook applies it on the next
   paid period (see above).

## Authorization concern (critical)

All three mutating edge functions (`create-checkout`, `cancel-subscription`,
`change-room-count`) use the **service-role** client and trust `hotelId` from
the request body. Because the client calls them with the **anon key** and the
functions do **not** verify that the authenticated user owns `hotelId`, anyone
who knows a `hotelId` can cancel, change, or checkout another hotel's
subscription. This is an IDOR (insecure direct object reference) flaw — see
[known-issues.md](./known-issues.md) #1.
