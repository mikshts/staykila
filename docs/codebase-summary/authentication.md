# Authentication & Onboarding

## Overview

Auth is handled by **Supabase Auth** (email/password and Google OAuth). The
React side wraps the app in `AuthProvider` and gates routes with
`ProtectedRoute`. A new user must also create/link a "hotel" before they can
use the dashboard — this is the onboarding step.

## Files

- `src/contexts/AuthContext.jsx` — session state + `login`/`register`/`logout`.
- `src/components/auth/Login.jsx` — email/password sign-in screen.
- `src/components/auth/Register.jsx` — property registration form (creates
  auth user + hotel + rooms + pricing + user row).
- `src/components/auth/AuthCallback.jsx` — OAuth redirect handler.
- `src/components/auth/HotelSetup.jsx` — post-auth hotel creation/linking.
- `src/components/auth/ProtectedRoute.jsx` — route guard.
- `src/pages/LandingPage.jsx` — marketing/entry page (route `/login`).
- `src/pages/PricingPage.jsx` — public pricing page (route `/pricing`).

## Routes (from `src/App.jsx`)

| Path | Element | Guarded? |
| --- | --- | --- |
| `/pricing` | `PricingPage` | No |
| `/login` | `LandingPage` | No |
| `/signin` | `Login` | No |
| `/register` | `Register` | No |
| `/auth/callback` | `AuthCallback` | No |
| `/setup` | `HotelSetup` | No |
| `/guest` | `GuestPortal` | No (public) |
| `/` | `Dashboard` | Yes |
| `/billing` | `BillingPage` | Yes |

## Session flow

1. `AuthProvider` mounts and calls `supabase.auth.getSession()`. If a session
   exists, it sets `user` and calls `fetchHotel(userId)`.
2. It also subscribes to `supabase.auth.onAuthStateChange` to keep `user` and
   `hotel` in sync on login/logout.
3. `fetchHotel`:
   - reads `hotel_id` from the `users` table (`maybeSingle`),
   - then fetches the full `hotels` row by that id.

## Registration flow (`register` in AuthContext)

1. `supabase.auth.signUp({ email, password, ... })`.
2. Insert a `hotels` row (name, owner, email).
3. Insert a `users` row linking `auth.uid` → `hotel_id` with `role: "admin"`.
   - If the user insert fails, it deletes the orphaned hotel.
4. Bulk-insert `rooms` (1..N, default 10, capped at 300), status `available`.
5. Bulk-insert default `pricing` rows (1/3/6/12/24h tiers at ₱100/250/450/800/1500).
6. On success the user is redirected to `/login` to sign in.

## OAuth callback flow (`AuthCallback`)

1. After Google redirects back, `getSession()` is read.
2. Look up the user's `hotel_id` in `users`.
   - If none, try to find a `hotels` row by the user's email and link it.
3. If a `hotel_id` exists → navigate to `/` (dashboard).
   - Otherwise → navigate to `/setup?rooms=<preferredRooms>` (onboarding).

> ⚠️ `AuthCallback` uses `.single()` for the users lookup. A brand-new Google
> user has no `users` row, so `.single()` throws and the `catch` sends them to
> `/login` instead of `/setup`. `HotelSetup` correctly uses `.maybeSingle()`.
> See [known-issues.md](./known-issues.md) (#7).

## Hotel setup flow (`HotelSetup`)

Retry-safe by design (uses `maybeSingle`/`upsert`):

1. If the user already has a `hotel_id`, fetch that hotel and continue (to
   verify rooms/pricing/subscription exist).
2. Else, reuse an orphaned hotel by email, or insert a new `hotels` row, then
   `upsert` the `users` link.
3. Create `rooms` only if the hotel has none yet.
4. `upsert` default `pricing` (single/double/family tiers).
5. Create a `subscriptions` row in `trial` status (30-day trial) **only if one
   does not already exist**.
6. Navigate to `/`.

## Route protection (`ProtectedRoute`)

Logic order:

1. While `loading` or subscription `isLoading` → spinner.
2. No `user` → redirect to `/login`.
3. Subscription fetch errored **but** hotel exists → render children (don't
   trap the user in setup).
4. `subscription` expired **and not already on `/billing`** → redirect to
   `/billing` (so expired users can renew). The `/billing` guard prevents an
   infinite redirect loop.
5. No subscription **and** no hotel → redirect to `/setup`.
6. Otherwise → render children.

> ⚠️ The audit noted an earlier version redirected expired users to `/billing`
> unconditionally, causing a loop. The current code guards against that with
> `location.pathname !== "/billing"`. Good — but the audit's #5 is effectively
> resolved in this version.
