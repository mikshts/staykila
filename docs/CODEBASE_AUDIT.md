# StayKila Codebase Audit

> Audit date: 2026-07-11
> Scope: Full codebase review (`src/`, `supabase/functions/`, config files)
> Stack: React 18 + Vite 4, Supabase (Postgres + Auth + Realtime + Edge Functions on Deno), PayMongo payments, Tailwind.

## Summary

StayKila is a hotel/lodge management app. The centerpiece is a ~1,436-line
`Dashboard.jsx`. The app is feature-rich (rooms, check-in/out, guest portal,
billing, pricing, analytics, QR codes), but has **critical security flaws** in
the billing/subscription edge functions and **functional bugs** that block core
revenue flows.

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## 🔴 Critical — Security

These are exploitable today, not theoretical.

### 1. Edge functions use Service Role with no ownership check (IDOR)
`create-checkout`, `cancel-subscription`, and `change-room-count` all do
`createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` and trust `hotelId` from the
request body. The client calls them with the **public anon key**
(`BillingPage.jsx:38`, `ManagePlan.jsx:38`, `SubscriptionManager.jsx:25`).

Because edge functions don't auto-verify that the JWT user owns `hotelId`,
**anyone who knows (or guesses) a `hotelId` can cancel, change, or checkout
another hotel's subscription.** This is a critical authorization flaw.

**Fix:** In each function, read the JWT (`req.headers.get('authorization')`),
create the client with the user's token, and verify
`SELECT hotel_id FROM users WHERE id = auth.uid()` matches the requested
`hotelId` before any write. Or pass the user id from the client and assert
ownership server-side.

### 2. PayMongo webhook has no signature verification
`paymongo-webhook/index.ts` has the check commented out (lines 11–15). The
endpoint is a public Supabase URL. Anyone can POST a forged
`checkout_session.payment.paid` event and **activate any subscription** by
`provider_subscription_id`.

**Fix:** Implement HMAC verification using `PAYMONGO_WEBHOOK_SECRET` (already
wired as an env var) before processing. Return 401 on mismatch.

### 3. No SQL migrations / RLS policies in the repo
There is no `supabase/migrations` folder and zero `CREATE POLICY` / RLS
definitions anywhere. The entire security model relies on app-level logic — and
as #1 shows, that logic is bypassable. Schema is also unmanaged (tables like
`subscription_changes`, `guest_sessions`, `activity_logs` exist only
implicitly).

**Fix:** Add versioned migrations with explicit `ENABLE ROW LEVEL SECURITY` and
per-table policies (users can only see their own hotel's rows). This is the real
backbone of Supabase security.

### 4. WiFi password cached in `localStorage` (plaintext)
`GuestPortal.jsx` caches the full room payload — including `wifiPassword` — into
`localStorage` (`guest_room_${roomId}`). Any script in the page (or a shared
device) can read it. Guest session tokens are also persisted there.

**Fix:** Don't persist secrets to `localStorage`. Fetch on load, keep in memory;
if caching is needed, exclude `wifiPassword`.

---

## 🟠 High — Functional bugs

### 5. Expired-user redirect loop on `/billing`
`ProtectedRoute.jsx:28` redirects to `/billing` when `subscription && isExpired`.
But `/billing` is **also** wrapped in `ProtectedRoute` (`App.jsx:38-45`). So an
expired user hitting `/billing` is redirected back to `/billing` → **infinite
loop**, and they can never reach the page to renew.

**Fix:** Exclude `/billing` from the expired redirect, or add an `allowExpired`
prop to `ProtectedRoute`.

### 6. `SubscriptionManager` calls a non-existent function
`SubscriptionManager.jsx:21` posts to `/functions/v1/paymongo-create-checkout`,
but the actual function is `create-checkout` (and `BillingPage.jsx:35` correctly
uses `create-checkout`). The dashboard's "Subscribe Now" button will 404.

**Fix:** Point it at `create-checkout`, or consolidate to a single subscribe
entrypoint.

### 7. `AuthCallback` uses `.single()` on the users table
`AuthCallback.jsx:30` does `.single()` for the users row. A brand-new Google
user has **no** users row yet, so `.single()` throws, the `catch` sends them to
`/login` instead of `/setup`.

**Fix:** Use `.maybeSingle()` (same pattern already correctly used in
`HotelSetup.jsx:47`).

### 8. Webhook marks `subscription_changes` "applied" prematurely
In `paymongo-webhook/index.ts`, the subscription update only applies the pending
change when `pending_change_effective_date <= now` (lines 53–62). But the
separate block at lines 81–87 marks `subscription_changes` as `applied` whenever
`subscription.pending_room_count` is truthy — i.e. **even when the effective date
is in the future and the change was NOT applied**. The room-count change would
then silently never take effect.

**Fix:** Only mark `applied` inside the branch that actually applied the change.

---

## 🟡 Medium — Code quality / maintainability

### 9. `Dashboard.jsx` is 1,436 lines and manipulates the DOM directly
Timers are updated via `document.querySelectorAll("[data-timer]")` + manual DOM
writes every second (`Dashboard.jsx:116-120`). This fights React's render model
and is fragile. Extract the timer logic into a small `<CountdownTimer
room={...}/>` component driven by state.

### 10. `Register.jsx` has a broken `useBrandFonts` copy
`Register.jsx:7-17` re-implements `useBrandFonts` but calls it as
`useState(() => {...})` instead of `useEffect`. The injection runs during render
and the dependency array is wrong. There's already a correct
`src/hooks/useBrandFonts.js` — delete the local copy and import the hook.

### 11. Dead code & unused deps
- `HotelContext.jsx` appears unused (everything switched to `useAuth`);
  `SubscriptionManager.jsx:4` even notes the switch. Confirm and remove if so.
- `qrcode.react` is declared in `package.json` but never imported (only
  `qrcode` is used). Remove it.
- `src/utils/` is empty; `src/components/layout/` is empty.

### 12. Duplicated magic number `30`
`PRICE_PER_ROOM = 30` is hardcoded in three places: `lib/pricing.js`,
`create-checkout/index.ts`, and `change-room-count/index.ts`. A price change
requires editing all three and redeploying functions. Centralize it (env var or
shared config).

### 13. Missing `lint`/`test` scripts & `.env.example`
`package.json` has no `lint` or `test` script despite an ESLint flat config.
There's no `.env.example` documenting `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `PAYMONGO_SECRET_KEY`, etc. — onboarding friction and
a place for secrets mistakes.

---

## 🟢 Low — Housekeeping

### 14. Junk files at repo root
`setSidebarOpen(true)}`, `setSoundEnabled(!soundEnabled)}`, and `git` are empty
artifact files (likely accidental saves / mistyped commands). Delete them —
they're confusing and could get committed.

### 15. `formatPrice` locale ambiguity
`pricing.js:22` uses `amount.toLocaleString()` with no locale. Client-only
today, but pin a locale (`'en-PH'`) for consistency with the `₱` currency.

### 16. `vite.config.js` build `sourcemap: true`
Fine for debugging, but source maps can leak source on a public CDN. Acceptable
for now; just be aware.

---

## What's done well ✅

- Single Supabase client instance; service-role client correctly commented out of
  the client bundle.
- Secrets are read from env (`Deno.env` / `import.meta.env`), not hardcoded.
- `HotelSetup` uses `upsert`/`maybeSingle` to be retry-safe; pricing defaults
  are sensible.
- Realtime subscriptions, guest sessions, and QR generation are reasonable
  feature implementations.
- `ErrorBoundary` wraps billing; `ProtectedRoute` exists.

---

## Recommended priority order

1. **#1, #2, #3** — auth/ownership checks + webhook signature + RLS. These are
   the difference between a safe and unsafe billing app.
2. **#5, #6, #7, #8** — the redirect loop and broken subscribe/checkout paths
   block core revenue flows.
3. **#4** — stop persisting WiFi passwords.
4. **#9–#13** — refactor `Dashboard`, fix `Register`, remove dead code/deps,
   centralize pricing.
5. **#14–#16** — cleanup.

## Key file references

| Concern | File |
| --- | --- |
| Edge function (checkout) | `supabase/functions/create-checkout/index.ts` |
| Edge function (webhook) | `supabase/functions/paymongo-webhook/index.ts` |
| Edge function (cancel) | `supabase/functions/cancel-subscription/index.ts` |
| Edge function (room count) | `supabase/functions/change-room-count/index.ts` |
| Billing page | `src/components/billing/BillingPage.jsx` |
| Manage plan | `src/components/billing/ManagePlan.jsx` |
| Dashboard subscribe | `src/components/dashboard/SubscriptionManager.jsx` |
| Route protection | `src/components/auth/ProtectedRoute.jsx` |
| Auth callback | `src/components/auth/AuthCallback.jsx` |
| Guest portal (localStorage) | `src/components/guest/GuestPortal.jsx` |
| Main dashboard | `src/components/dashboard/Dashboard.jsx` |
| Register (broken hook) | `src/components/auth/Register.jsx` |
| Pricing config | `src/lib/pricing.js` |
| Supabase client | `src/lib/supabase.js` |
