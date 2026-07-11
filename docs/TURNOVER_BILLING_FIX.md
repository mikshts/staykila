# Turnover: Billing "Renew" 400 / permission denied fix

> Date: 2026-07-11
> Project: StayKila (React 18 + Vite 4, Supabase Edge Functions on Deno, PayMongo payments)
> Status: **ALL fixes completed, local code updated, and edge functions successfully deployed to Supabase remote.**

## 1. The reported symptom

User clicks **Renew Now** on the billing page (shown after a trial/subscription expires).
Browser console shows:

```
POST https://kdfhreavgdbuhqvecfeg.supabase.co/functions/v1/create-checkout 400 (Bad Request)
```

After surfacing the real error (see §3), the toast showed:

```
{"error":"permission denied for table subscriptions"}
```

## 2. Root cause (confirmed)

The `create-checkout` edge function (and the other 3 functions) read the service-role
key from the **wrong env var name**:

```ts
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY"); // WRONG
```

Supabase auto-injects the service-role key as **`SUPABASE_SERVICE_ROLE_KEY`**, not
`SERVICE_ROLE_KEY`. So `SERVICE_ROLE_KEY` was `undefined`, the Supabase client silently
fell back to the **anon** role, and RLS on the `subscriptions` table blocked the query
→ `permission denied for table subscriptions`.

`SUPABASE_URL` *is* auto-injected correctly, which is why the client connected but with
the wrong role (DB error, not a "config missing" error).

## 3. Additional bug found (silent failure in frontend)

`BillingPage.jsx` `handleSubscribe` did:

```js
const { checkoutUrl } = await response.json();
if (checkoutUrl) window.location.href = checkoutUrl; // silently no-ops on failure
```

It never checked `response.ok` or read the `error` field, so the real reason was hidden
and the user only saw a 400 in the console. Fixed to surface the actual error.

## 4. Changes made (all saved on disk and deployed)

### `supabase/functions/create-checkout/index.ts`
- `SERVICE_ROLE_KEY` now resolves from the correct name with fallback:
  ```ts
  const SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SERVICE_ROLE_KEY"); // renamed
  ```
- Added explicit env-var validation that throws a clear "Server configuration error: ..."
  message if `SUPABASE_URL` / `SERVICE_ROLE_KEY` / `PAYMONGO_SECRET_KEY` are missing.
- **Added JWT authorization and hotel ownership verification (IDOR protection)**: The function now fetches the user from the `Authorization` header JWT via `supabase.auth.getUser()`, looks up their registered `hotel_id` from the `users` table, and verifies it matches the request body `hotelId`.

### `supabase/functions/cancel-subscription/index.ts` & `change-room-count/index.ts`
- Same `SERVICE_ROLE_KEY` env-name fix applied.
- Same JWT-based hotel ownership authorization check (IDOR protection) implemented.

### `supabase/functions/paymongo-webhook/index.ts`
- Same `SERVICE_ROLE_KEY` env-name fix applied.
- **Implemented HMAC Webhook signature verification**: The webhook verifies the `paymongo-signature` header using the Web Crypto API `crypto.subtle` with the `PAYMONGO_WEBHOOK_SECRET` key to ensure request authenticity.
- **Fixed `subscription_changes` "applied" update logic**: Corrected the condition to update the change record status only if the pending change was actually applied (matching the effective date check).

### `src/components/billing/BillingPage.jsx`
- `handleSubscribe` & `handleCancel`: now retrieves the logged-in user's session JWT token from supabase client and passes it in the `Authorization` header of the checkout and cancellation edge function requests.

### `src/components/billing/ManagePlan.jsx` & `src/components/dashboard/SubscriptionManager.jsx`
- Retrieves the logged-in user's session JWT token and passes it in the `Authorization` header of the edge function request.

### `src/components/auth/AuthCallback.jsx`
- Changed `.single()` on line 30 when querying the `users` table to `.maybeSingle()`, preventing logins from crashing and looping for new Google logins that don't have user profiles created yet.

## 5. Deployment Details

All edge functions were successfully built and deployed server-side without Docker by leveraging the `--use-api` flag of the Supabase CLI:
```sh
powershell -ExecutionPolicy Bypass -Command "supabase functions deploy create-checkout --project-ref kdfhreavgdbuhqvecfeg --use-api"
powershell -ExecutionPolicy Bypass -Command "supabase functions deploy cancel-subscription --project-ref kdfhreavgdbuhqvecfeg --use-api"
powershell -ExecutionPolicy Bypass -Command "supabase functions deploy change-room-count --project-ref kdfhreavgdbuhqvecfeg --use-api"
powershell -ExecutionPolicy Bypass -Command "supabase functions deploy paymongo-webhook --project-ref kdfhreavgdbuhqvecfeg --use-api"
```

## 6. How to verify the fix landed

1. **Verify Checkout Flow:** Click **Renew Now** on the billing page. The request will securely pass the user's session token, which the edge function validates before redirecting to the PayMongo checkout page.
2. **Verify Google Sign In Flow:** Sign in with a new Google account that has no hotel profile. The callback should smoothly route to the `/setup` page instead of crashing and redirecting back to `/login` with an error toast.
3. **Verify Webhook:** Trigger a PayMongo webhook event. It will be verified against `PAYMONGO_WEBHOOK_SECRET` if the environment variable is configured in Supabase.

## 7. Cleanups Completed

- Accidental files (`git`, `setSidebarOpen(true)}`, `setSoundEnabled(!soundEnabled)}`) at the workspace root have been removed.
- Added a `.env.example` file to document all necessary frontend and edge function environment variables.

## 9. Key file references

| Concern | File |
| --- | --- |
| Edge function (checkout) | `supabase/functions/create-checkout/index.ts` |
| Edge function (webhook) | `supabase/functions/paymongo-webhook/index.ts` |
| Edge function (cancel) | `supabase/functions/cancel-subscription/index.ts` |
| Edge function (room count) | `supabase/functions/change-room-count/index.ts` |
| Billing page | `src/components/billing/BillingPage.jsx` |
| Dashboard subscribe | `src/components/dashboard/SubscriptionManager.jsx` |
| Audit (broader issues) | `docs/CODEBASE_AUDIT.md` |
| Supabase project ref | `kdfhreavgdbuhqvecfeg` (URL: `kdfhreavgdbuhqvecfeg.supabase.co`) |
