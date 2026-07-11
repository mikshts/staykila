# Known Issues

Carried over from `docs/CODEBASE_AUDIT.md` (audit date 2026-07-11). Listed by
severity. Some items were verified against the current code while writing this
summary; notes are included where the code has since changed.

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low

---

## 🔴 Critical — Security

### 1. Edge functions use service role with no ownership check (IDOR)
`create-checkout`, `cancel-subscription`, and `change-room-count` all call
`createClient(SUPABASE_URL, SERVICE_ROLE_KEY)` and trust `hotelId` from the
request body. The client invokes them with the **anon key**
(`BillingPage.jsx:39`, `ManagePlan.jsx:38`). Because the functions don't verify
that the JWT user owns `hotelId`, **anyone who knows a `hotelId` can cancel,
change, or checkout another hotel's subscription.**

**Fix:** Read the JWT in each function, create the client with the user's token,
and assert `SELECT hotel_id FROM users WHERE id = auth.uid()` matches the
requested `hotelId` before any write.

### 2. PayMongo webhook has no signature verification
`paymongo-webhook/index.ts` has the signature check commented out (lines 11–15).
The endpoint is a public Supabase URL, so anyone can POST a forged
`checkout_session.payment.paid` event and **activate any subscription** by
`provider_subscription_id`.

**Fix:** Implement HMAC verification using `PAYMONGO_WEBHOOK_SECRET` (already an
env var) and return 401 on mismatch.

### 3. No SQL migrations / RLS policies in the repo
There is no `supabase/migrations` folder and zero `CREATE POLICY` / RLS
definitions. The entire security model relies on app-level logic, which (per
#1) is bypassable. Tables exist only implicitly in the deployed DB.

**Fix:** Add versioned migrations with `ENABLE ROW LEVEL SECURITY` and
per-table policies (users see only their own hotel's rows).

### 4. WiFi password cached in `localStorage` (plaintext)
`GuestPortal.jsx` caches the full room payload — including `wifiPassword` — into
`localStorage` (`guest_room_${roomId}`), and persists the guest session token
there too. Any script in the page (or a shared device) can read it.

**Fix:** Don't persist secrets to `localStorage`. Fetch on load, keep in memory;
if caching is needed, exclude `wifiPassword`.

---

## 🟠 High — Functional bugs

### 5. Expired-user redirect loop on `/billing` — RESOLVED in current code
The audit described `ProtectedRoute` redirecting expired users to `/billing`
unconditionally, causing a loop. The current `ProtectedRoute.jsx:32` guards with
`location.pathname !== "/billing"`, so expired users can reach billing to renew.
**No action needed** (kept for historical context).

### 6. `SubscriptionManager` calls a non-existent function
`SubscriptionManager.jsx` posts to `/functions/v1/paymongo-create-checkout`, but
the real function is `create-checkout` (and `BillingPage.jsx` uses the correct
name). The dashboard "Subscribe Now" button would 404.

**Fix:** Point it at `create-checkout`, or consolidate to one subscribe
entrypoint.

### 7. `AuthCallback` uses `.single()` on the users table
`AuthCallback.jsx:30` does `.single()` for the users row. A brand-new Google
user has no users row, so `.single()` throws and the `catch` sends them to
`/login` instead of `/setup`.

**Fix:** Use `.maybeSingle()` (the pattern already correctly used in
`HotelSetup.jsx:47`).

### 8. Webhook marks `subscription_changes` "applied" prematurely
In `paymongo-webhook/index.ts`, the subscription update only applies the pending
change when `pending_change_effective_date <= now` (lines 53–62). But the block
at lines 81–87 marks `subscription_changes` as `applied` whenever
`subscription.pending_room_count` is truthy — i.e. **even when the effective
date is in the future and the change was NOT applied**. The room-count change
would then silently never take effect.

**Fix:** Only mark `applied` inside the branch that actually applied the change.

---

## 🟡 Medium — Code quality / maintainability

### 9. `Dashboard.jsx` is ~1,436 lines and manipulates the DOM directly
Timers update via `document.querySelectorAll("[data-timer]")` + manual DOM writes
every second (`Dashboard.jsx:118-145`). This fights React's render model and is
fragile. Extract timer logic into a `<CountdownTimer room={...}/>` driven by
state.

### 10. `Register.jsx` — audit note no longer matches current code
The audit claimed `Register.jsx` had a broken local `useBrandFonts` copy using
`useState` instead of `useEffect`. The current `Register.jsx` is a clean form
that imports `useAuth` and does **not** redefine the hook. **Likely already
fixed** — verify before acting.

### 11. Dead code & unused deps
- `HotelContext.jsx` appears unused (everything switched to `useAuth`).
- `qrcode.react` is declared in `package.json` but never imported (only `qrcode`
  is used). Remove it.
- `src/utils/` is empty; `src/components/layout/` is empty.

### 12. Duplicated magic number `59`
`PRICE_PER_ROOM = 59` is hardcoded in three places: `lib/pricing.js`,
`create-checkout/index.ts`, and `change-room-count/index.ts`. A price change
requires editing all three and redeploying functions. Centralize it (env var or
shared config).

### 13. Missing `lint`/`test` scripts & `.env.example`
`package.json` has no `lint` or `test` script despite an ESLint flat config.
There's no `.env.example` documenting `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `PAYMONGO_SECRET_KEY`, etc.

---

## 🟢 Low — Housekeeping

### 14. Junk files at repo root
`setSidebarOpen(true)}`, `setSoundEnabled(!soundEnabled)}`, and `git` are empty
artifact files (likely accidental saves). Delete them.

### 15. `formatPrice` locale ambiguity
`pricing.js:22` uses `amount.toLocaleString()` with no locale. Pin a locale
(`'en-PH'`) for consistency with the `₱` currency.

### 16. `vite.config.js` build `sourcemap: true`
Fine for debugging, but source maps can leak source on a public CDN. Acceptable
for now.

---

## What's done well ✅

- Single Supabase client instance; service-role client correctly commented out
  of the client bundle.
- Secrets are read from env (`Deno.env` / `import.meta.env`), not hardcoded.
- `HotelSetup` uses `upsert`/`maybeSingle` to be retry-safe; pricing defaults
  are sensible.
- Realtime subscriptions, guest sessions, and QR generation are reasonable
  feature implementations.
- `ErrorBoundary` wraps billing; `ProtectedRoute` exists (and the expired-user
  loop is handled).
