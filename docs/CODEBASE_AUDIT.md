# StayKila Codebase Audit

> Updated: 2026-07-15 &nbsp;·&nbsp; Original audit: 2026-07-11
> Scope: `src/`, `supabase/functions/`, config files
> Stack: React 18 + Vite 4, Supabase (Postgres + Auth + Realtime + Edge Functions on Deno), PayMongo payments, Tailwind.

### Audit status summary

| # | Issue | Severity | Status |
| --- | --- | --- | --- |
| 1 | Edge functions — no ownership check (IDOR) | 🔴 Critical | ✅ Resolved |
| 2 | PayMongo webhook — no signature verification | 🔴 Critical | ✅ Resolved |
| 3 | No SQL migrations / RLS policies | 🔴 Critical | ❗ Open |
| 4 | WiFi password cached in localStorage (plaintext) | 🔴 Critical | ❗ Open |
| 5 | Expired-user redirect loop on `/billing` | 🟠 High | ✅ Resolved |
| 6 | `SubscriptionManager` calls non-existent function | 🟠 High | ✅ Resolved |
| 7 | `AuthCallback` uses `.single()` (new-user crash) | 🟠 High | ✅ Resolved |
| 8 | Webhook marks `subscription_changes` applied prematurely | 🟠 High | ✅ Resolved |
| 9 | `Dashboard.jsx` DOM manipulation / 1,436 lines | 🟡 Medium | ❗ Open |
| 10 | `Register.jsx` broken `useBrandFonts` copy | 🟡 Medium | ✅ Resolved |
| 11 | Dead code & unused dependencies | 🟡 Medium | ❗ Open |
| 12 | Duplicated magic number `59` (pricing) | 🟡 Medium | ❗ Open |
| 13 | Missing test script & `.env.example` | 🟡 Medium | ❗ Open (partial) |
| 14 | Junk files at repo root | 🟢 Low | ❗ Open |
| 15 | `formatPrice` locale ambiguity | 🟢 Low | ❗ Open |
| 16 | Source maps in production build | 🟢 Low | ❗ Open |

---

## ✅ Resolved (7 of 16)

These were addressed after the original audit. See `docs/TURNOVER_BILLING_FIX.md` for details on #1, #2, and #8.

<dl>
<dt><strong>#1 — Edge function IDOR</strong></dt>
<dd>All four edge functions now verify JWT auth header and confirm the user owns the hotel before writing. <em>(2026-07-11)</em></dd>
<dt><strong>#2 — PayMongo webhook HMAC</strong></dt>
<dd>HMAC signature verification implemented using <code>PAYMONGO_WEBHOOK_SECRET</code>. Returns 401 on mismatch. <em>(2026-07-11)</em></dd>
<dt><strong>#5 — Expired-user redirect loop</strong></dt>
<dd><code>ProtectedRoute.jsx</code> now guards with <code>location.pathname !== "/billing"</code>, so expired users land on billing without looping. <em>(2026-07-11)</em></dd>
<dt><strong>#6 — Non-existent function call</strong></dt>
<dd><code>SubscriptionManager.jsx</code> corrected from <code>paymongo-create-checkout</code> → <code>create-checkout</code>. <em>(2026-07-11)</em></dd>
<dt><strong>#7 — AuthCallback <code>.single()</code></strong></dt>
<dd>Changed to <code>.maybeSingle()</code> — new Google OAuth users no longer crash on first sign-in. <em>(2026-07-11)</em></dd>
<dt><strong>#8 — Webhook premature "applied"</strong></dt>
<dd>Room-count change applied only inside the effective-date branch. <em>(2026-07-11)</em></dd>
<dt><strong>#10 — Register.jsx broken hook</strong></dt>
<dd>The local <code>useBrandFonts</code> copy (using <code>useState</code> incorrectly) is removed. <code>Register.jsx</code> now imports <code>useAuth</code> directly. <em>(2026-07-11)</em></dd>
</dl>

---

## 🔴 Remaining — Critical

### 3. No SQL migrations / RLS policies in the repo

`supabase/` contains only `functions/` and `.temp/` — no `migrations/` folder, zero `CREATE POLICY` / RLS definitions. The entire security model relies on app-level checks. Schema is also unmanaged (tables like `subscription_changes`, `guest_sessions`, `activity_logs` exist only implicitly on the database).

**Fix:** Add versioned migrations with explicit `ENABLE ROW LEVEL SECURITY` and per-table policies (users can only see their own hotel's rows). This is the real backbone of Supabase security — without it, app-level checks are a single line of defense.

---

### 4. WiFi password cached in `localStorage` (plaintext)

`GuestPortal.jsx` caches the full room payload — including `wifiPassword` — into `localStorage` (`guest_room_${roomId}`). Any script on the page (or a shared device) can read it. Guest session tokens are also persisted there.

**Fix:** Don't persist secrets to `localStorage`. Fetch on load, keep in memory; if caching is needed, exclude `wifiPassword`.

---

## 🟡 Remaining — Medium

### 9. `Dashboard.jsx` is 1,436 lines and manipulates the DOM directly

Timers are updated via `document.querySelectorAll("[data-timer]")` + manual DOM writes every second. This fights React's render model and is fragile. Extract timer logic into a `<CountdownTimer room={...}/>` component driven by state.

---

### 11. Dead code & unused dependencies

- `HotelContext.jsx` — appears unused (everything switched to `useAuth`). `SubscriptionManager.jsx:4` even notes the switch. Confirm and remove.
- `qrcode.react` — declared in `package.json` but never imported (only `qrcode` is used). Remove it.
- `src/utils/` — empty directory.
- `src/components/layout/` — empty directory.

---

### 12. Duplicated magic number `59`

`pricePerRoom: 59` is in `lib/pricing.js` and must be kept in sync with edge functions `create-checkout` and `change-room-count` (the `lib/pricing.js` file itself notes this). A price change still requires editing multiple places. Centralize it (env var or shared config pushed to all functions).

---

### 13. Missing test script & `.env.example`

`package.json` has `lint` (✅ resolved), but still no `test` script. There is no `.env.example` documenting `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `PAYMONGO_SECRET_KEY` — this is onboarding friction and a place for secrets mistakes.

---

## 🟢 Remaining — Low / Housekeeping

### 14. Junk files at repo root

`setSidebarOpen(true)}`, `setSoundEnabled(!soundEnabled)}`, and `git` are empty artifact files (likely accidental saves / mistyped commands). Delete them.

### 15. `formatPrice` locale ambiguity

`pricing.js` uses `amount.toLocaleString()` with no locale. Pin a locale (`'en-PH'`) for consistency with the `₱` currency.

### 16. Source maps in production build

`vite.config.js` has `sourcemap: true` — fine for debugging but can leak source on a public CDN. Low priority; just be aware.

---

## What's done well ✅

- Single Supabase client instance; service-role client excluded from client bundle.
- Secrets read from env (`Deno.env` / `import.meta.env`), not hardcoded.
- `HotelSetup` uses `upsert`/`maybeSingle` to be retry-safe; pricing defaults are sensible.
- Realtime subscriptions, guest sessions, and QR generation are solid feature implementations.
- `ErrorBoundary` wraps billing; `ProtectedRoute` exists and handles expired/payment-stuck states.
- Edge functions now validate JWT ownership before writing (see #1).

---

## Recommended priority order

1. **#3** — Migrations + RLS. This is the single biggest security gap remaining.
2. **#4** — Stop persisting WiFi passwords in localStorage.
3. **#9** — Refactor `Dashboard.jsx` timer/DOM manipulation.
4. **#11** — Remove dead code and unused dependencies.
5. **#12** — Centralize pricing constant.
6. **#13–#16** — Housekeeping (`.env.example`, junk files, locale, source maps).
