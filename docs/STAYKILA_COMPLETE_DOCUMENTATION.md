# StayKila — Complete Documentation & Issues

> Generated: 2026-07-15
> Stack: React 18 + Vite 4, Supabase (Postgres + Auth + Realtime + Edge Functions), PayMongo payments, Tailwind CSS.

---

## Table of Contents

1. [What is StayKila](#1-what-is-staykila)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Directory Structure](#3-directory-structure)
4. [Authentication & Onboarding](#4-authentication--onboarding)
5. [Data Model](#5-data-model)
6. [Room Lifecycle](#6-room-lifecycle)
7. [Guest Portal](#7-guest-portal)
8. [Billing & Subscriptions](#8-billing--subscriptions)
9. [Key Files Reference](#9-key-files-reference)
10. [Known Issues & Bugs — To Fix](#10-known-issues--bugs--to-fix)
11. [Resolved Issues (7 of 16)](#11-resolved-issues)
12. [What's Done Well](#12-whats-done-well)

---

## 1. What is StayKila

StayKila is a hotel / lodge management web app. A property owner registers a "hotel" (a single property), gets a grid of rooms, and manages short-stay bookings (check-in, extend, check-out), pricing, guest messaging, and a public guest portal (QR-code entry, WiFi, menu, chat). Revenue is collected via a PayMongo-backed monthly subscription billed per room.

### URL format

- **Main dashboard**: `/` (protected, requires auth)
- **Guest portal**: `/guest?room=<hotelId>_<roomId>&name=<roomName>` (public)
- **Billing**: `/billing` (protected)
- **Login**: `/login` / `/signin`
- **Register**: `/register`
- **Pricing**: `/pricing`
- **Setup**: `/setup`

---

## 2. Architecture & Tech Stack

StayKila is a client-heavy SPA with a thin backend implemented entirely as Supabase (managed Postgres + Auth + Realtime + Edge Functions). There is no custom application server.

### Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18 + Vite 4 + react-router-dom v6 |
| Styling | Tailwind CSS v3 (navy `#0f1b2d`, gold `#c9a84c`) |
| Backend | Supabase (Postgres + Auth + Realtime) |
| Edge functions | Deno (service-role key) |
| Payments | PayMongo (checkout, cards, GCash, PayMaya) |
| Notifications | react-hot-toast |
| QR generation | qrcode + jszip (bulk download) |
| Calendar | react-calendar |

### Routing (from `src/App.jsx`)

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

---

## 3. Directory Structure

```
staykila/
├── docs/
│   ├── CODEBASE_AUDIT.md
│   ├── TURNOVER_BILLING_FIX.md
│   ├── STAYKILA_COMPLETE_DOCUMENTATION.md
│   └── codebase-summary/
│       ├── architecture.md
│       ├── authentication.md
│       ├── billing-subscriptions.md
│       ├── data-model.md
│       ├── guest-portal.md
│       ├── key-files.md
│       ├── known-issues.md
│       ├── room-lifecycle.md
│       └── README.md
├── public/
├── src/
│   ├── components/
│   │   ├── analytics/       # AnalyticsPanel.jsx
│   │   ├── auth/            # Login, Register, AuthCallback, HotelSetup, ProtectedRoute
│   │   ├── billing/         # BillingPage, ManagePlan, BillingCard, TrialBanner
│   │   ├── dashboard/       # Dashboard (~1,436 lines), RoomGrid, RoomList, StatsCards, Sidebar, TopBar, QRDownload, SubscriptionManager
│   │   ├── guest/           # GuestPortal, ImageViewer
│   │   ├── modals/          # CheckinModal, CheckoutModal, ExtendModal, MenuModal, PriceModal, QRModal, WifiModal
│   │   ├── pricing/         # PricingCalculator
│   │   ├── reports/         # ReportsPanel (Night Audit)
│   │   ├── settings/        # RoomDetailPanel, SettingsPanel, MessagesPanel, ActivityPanel, CalendarManager
│   │   └── common/          # Shared UI
│   ├── contexts/            # AuthContext, HotelContext (unused)
│   ├── hooks/               # useSubscription, usePayments, useBrandFonts
│   ├── lib/                 # supabase.js, pricing.js, guestUrl.js
│   ├── pages/               # LandingPage, PricingPage
│   ├── services/            # roomService.js, messageService.js
│   ├── utils/               # (empty)
│   ├── App.jsx              # Router + route definitions
│   ├── main.jsx             # React entry point
│   └── sound.js             # Web Audio alert tones
├── supabase/functions/
│   ├── create-checkout/
│   ├── cancel-subscription/
│   ├── change-room-count/
│   └── paymongo-webhook/
└── package.json
```

---

## 4. Authentication & Onboarding

Auth is handled by **Supabase Auth** (email/password and Google OAuth).

### Files

- `src/contexts/AuthContext.jsx` — session state + `login`/`register`/`logout`
- `src/components/auth/Login.jsx` — email/password sign-in
- `src/components/auth/Register.jsx` — property registration form
- `src/components/auth/AuthCallback.jsx` — OAuth redirect handler
- `src/components/auth/HotelSetup.jsx` — post-auth hotel creation/linking
- `src/components/auth/ProtectedRoute.jsx` — route guard

### Session flow

1. `AuthProvider` mounts → `supabase.auth.getSession()`. If session exists, sets `user` and calls `fetchHotel(userId)`.
2. Subscribes to `supabase.auth.onAuthStateChange` to keep `user` / `hotel` in sync.
3. `fetchHotel`: reads `hotel_id` from `users` (`.maybeSingle`), then fetches the full `hotels` row.

### Registration flow

1. `supabase.auth.signUp({ email, password })`.
2. Insert `hotels` row.
3. Insert `users` row linking `auth.uid` → `hotel_id` with `role: "admin"`.
4. Bulk-insert `rooms` (1..N, default 10, capped at 300).
5. Bulk-insert default `pricing` rows.
6. Redirect to `/login`.

### Route protection (`ProtectedRoute`)

1. Loading → spinner.
2. No `user` → redirect to `/login`.
3. Subscription errored but hotel exists → render children.
4. Subscription expired **and not on `/billing`** → redirect to `/billing`.
5. No subscription + no hotel → redirect to `/setup`.
6. Otherwise → render children.

---

## 5. Data Model

> No SQL migrations exist. Tables exist only in the deployed database.

### Tables

| Table | Key Columns | Linked To |
| --- | --- | --- |
| **users** | `id`, `hotel_id`, `full_name`, `role`, `email` | `hotels.id` |
| **hotels** | `id`, `name`, `owner`, `email`, `wifi_password` | — |
| **rooms** | `id`, `hotel_id`, `name`, `status`, `room_type`, `notes` | `hotels.id` |
| **bookings** | `id`, `room_id`, `hotel_id`, `guest_name`, `start_time`, `end_time`, `hours`, `price`, `status` | `rooms.id`, `hotels.id` |
| **pricing** | `hotel_id`, `duration_hours`, `price`, `room_type` | `hotels.id` |
| **subscriptions** | `id`, `hotel_id`, `room_count`, `price_per_room`, `monthly_amount`, `subscription_status`, `provider_subscription_id` | `hotels.id` |
| **subscription_changes** | `id`, `hotel_id`, `subscription_id`, `old/new_room_count`, `old/new_amount`, `effective_date`, `status` | `subscriptions.id` |
| **payments** | `id`, `hotel_id`, `subscription_id`, `amount`, `status`, `paymongo_session_id` | `subscriptions.id` |
| **messages** | `id`, `room_id`, `hotel_id`, `sender`, `message`, `is_read`, `read_at` | `rooms.id` |
| **guest_sessions** | `id`, `room_id`, `token`, `is_active`, `expires_at` | `rooms.id` |
| **menu_images** | `id`, `hotel_id`, `image_url`, `display_order` | `hotels.id` |
| **activity_logs** | `id`, `hotel_id`, `user_id`, `action_type`, `description` | `hotels.id` |
| **revenue_summary** | `hotel_id`, `total_revenue`, `total_checkins`, `total_active_bookings`, `occupancy_rate` | `hotels.id` |

### Key relationships

- A **user** belongs to one **hotel** (`users.hotel_id`).
- A **hotel** has many **rooms**, **bookings**, **pricing** rows, **subscriptions**, **payments**, **messages**, **menu_images**, **activity_logs**.
- A **room** has many **bookings** (one active at a time).
- A **subscription** has many **subscription_changes** and **payments**.
- **guest_sessions** are per-room, short-lived (24h).

---

## 6. Room Lifecycle

### State machine

```
available → (check-in) → occupied → (check-out) → cleaning → (mark available) → available
                              ↑         extend (adds hours + price)
Transient: expiring (end_time near), expired (end_time passed)
```

### Key Dashboard operations

**Check-in**: Insert booking (status: "active"), update room → "occupied", log activity.

**Extend**: Update booking end_time/hours/price, call `rpc('add_extension_revenue')`, log activity.

**Check-out**: Update booking → "completed", room → "cleaning", delete room messages, log activity.

**Mark available**: cleaning → available.

**Other**: Save prices, update WiFi, upload/remove menu images, send admin message.

---

## 7. Guest Portal

### Overview

Public screen at `/guest` keyed by `room` query parameter. Shows room status, countdown, WiFi, menu, and chat.

### Load flow

1. Parse `room` param → `hotelId`, `roomId`.
2. **Cache first**: read `localStorage["guest_room_<roomId>"]` — instant render.
3. **Fresh fetch**: load room, hotel, booking, menu, messages.
4. **Guest session**: create `guest_sessions` row (24h expiry), persist token.
5. **Realtime**: subscribe to `messages` filtered by `room_id`.
6. **Re-cache**: write payload back to `localStorage`.

### Features

- Live countdown timer
- WiFi reveal (`hotels.wifi_password`)
- Menu gallery with ImageViewer
- Quick actions + free-text chat (guest = `sender: "guest"`, admin replies via realtime)
- Offline fallback to cache

### ⚠️ Security concern

WiFi password and guest session token cached in `localStorage` in plaintext. Anyone on a shared device can read them.

---

## 8. Billing & Subscriptions

### Pricing model

- `pricePerRoom: 59` (₱/room/month)
- `currency: "₱"`, `currencyCode: "PHP"`
- `trialDays: 30`
- `minRooms: 1`, `maxRooms: 300`

### Subscribe flow

1. Client posts `{ hotelId, roomCount }` to `create-checkout` edge function.
2. Edge function creates PayMongo checkout session with line item = `roomCount * 59`.
3. Stores `provider_subscription_id` and inserts pending `payments` row.
4. Client redirects to PayMongo checkout URL → user pays.
5. PayMongo fires webhook → `paymongo-webhook` activates subscription.

### Cancel flow

Client posts to `cancel-subscription` → sets `cancel_at_period_end = true`.

### Change room count

Client posts to `change-room-count` → inserts `subscription_changes` row (status: "pending"), stores pending fields on subscription. Webhook applies on next paid period.

---

## 9. Key Files Reference

### Auth

| File | Role |
| --- | --- |
| `src/contexts/AuthContext.jsx` | Session state, login/register/logout |
| `src/components/auth/ProtectedRoute.jsx` | Route guard (auth + subscription + expiry) |
| `src/components/auth/Register.jsx` | Property registration |
| `src/components/auth/AuthCallback.jsx` | OAuth redirect handler |
| `src/components/auth/HotelSetup.jsx` | Create/link hotel, rooms, pricing, trial |

### Dashboard

| File | Role |
| --- | --- |
| `src/components/dashboard/Dashboard.jsx` | Main management screen (~1,436 lines) |
| `src/components/dashboard/RoomGrid.jsx` | Grid room view |
| `src/components/dashboard/RoomList.jsx` | List room view |
| `src/components/dashboard/StatsCards.jsx` | Summary stat cards |
| `src/components/dashboard/Sidebar.jsx` | Navigation sidebar |
| `src/components/dashboard/SubscriptionManager.jsx` | In-dashboard subscribe |
| `src/components/dashboard/QRDownload.jsx` | Bulk QR download |

### Guest portal

| File | Role |
| --- | --- |
| `src/components/guest/GuestPortal.jsx` | Guest portal (~1,090 lines) |
| `src/components/guest/ImageViewer.jsx` | Menu image viewer |

### Billing

| File | Role |
| --- | --- |
| `src/components/billing/BillingPage.jsx` | Subscribe, cancel, payment history |
| `src/components/billing/ManagePlan.jsx` | Change room count |

### Modals & settings

| File | Role |
| --- | --- |
| `src/components/modals/CheckinModal.jsx` | Check-in form |
| `src/components/modals/CheckoutModal.jsx` | Check-out confirm |
| `src/components/modals/ExtendModal.jsx` | Extend stay |
| `src/components/modals/MenuModal.jsx` | Menu upload |
| `src/components/modals/WifiModal.jsx` | WiFi settings |
| `src/components/modals/PriceModal.jsx` | Price editing |
| `src/components/modals/QRModal.jsx` | QR code view |
| `src/components/settings/RoomDetailPanel.jsx` | Room detail editing |
| `src/components/settings/MessagesPanel.jsx` | Admin message view |
| `src/components/settings/ActivityPanel.jsx` | Activity log view |
| `src/components/settings/CalendarManager.jsx` | Booking calendar |

### Reports

| File | Role |
| --- | --- |
| `src/components/reports/ReportsPanel.jsx` | Night Audit printed report |

### Hooks, lib, services

| File | Role |
| --- | --- |
| `src/hooks/useSubscription.js` | Subscription state + derived flags |
| `src/hooks/usePayments.js` | Payment history |
| `src/lib/pricing.js` | Price config + helpers |
| `src/lib/guestUrl.js` | Build/parse guest room URLs |
| `src/services/roomService.js` | Room/booking data helpers |
| `src/services/messageService.js` | Messages, guest sessions, realtime |

### Edge functions (Deno)

| File | Role |
| --- | --- |
| `supabase/functions/create-checkout/index.ts` | Create PayMongo checkout session |
| `supabase/functions/cancel-subscription/index.ts` | Set `cancel_at_period_end` |
| `supabase/functions/change-room-count/index.ts` | Schedule pending room-count change |
| `supabase/functions/paymongo-webhook/index.ts` | Receive PayMongo events, activate subscription |

---

## 10. Known Issues & Bugs — To Fix

### 🔴 Critical — Security (Fix immediately)

#### Issue 3: No SQL migrations / RLS policies in repo
- **Files**: N/A (missing `supabase/migrations/` folder)
- **Problem**: No migrations folder, zero `CREATE POLICY` / RLS definitions. Entire security model relies on app-level checks. Schema is applied manually on deployed DB.
- **Fix**: Add versioned migrations with `ENABLE ROW LEVEL SECURITY` and per-table policies.

#### Issue 4: WiFi password cached in localStorage (plaintext)
- **File**: `src/components/guest/GuestPortal.jsx`
- **Problem**: Caches `wifiPassword` into `localStorage` (`guest_room_${roomId}`). Guest session tokens also persisted there. Anyone on a shared device can read them.
- **Fix**: Don't persist secrets to `localStorage`. Fetch on load, keep in memory. Or exclude `wifiPassword` from cache.

### 🟡 Medium — Code quality / maintainability

#### Issue 9: Dashboard.jsx is ~1,436 lines and manipulates the DOM directly
- **File**: `src/components/dashboard/Dashboard.jsx`
- **Problem**: Timers use `document.querySelectorAll("[data-timer]")` + manual DOM writes every second. Fights React's render model. Fragile.
- **Fix**: Extract timer logic into a `<CountdownTimer room={...}/>` component driven by state.

#### Issue 11: Dead code & unused dependencies
- **Files**: `src/contexts/HotelContext.jsx`, `package.json`
- **Problems**:
  - `HotelContext.jsx` — unused (everything uses `useAuth`)
  - `qrcode.react` — declared in `package.json`, never imported
  - `src/utils/` — empty directory
  - `src/components/layout/` — empty directory

#### Issue 12: Duplicated magic number `59`
- **Files**: `src/lib/pricing.js`, `supabase/functions/create-checkout/index.ts`, `supabase/functions/change-room-count/index.ts`
- **Problem**: `PRICE_PER_ROOM = 59` hardcoded in 3 places. Price change needs editing all 3 + redeploying functions.
- **Fix**: Centralize to env var or shared config.

#### Issue 13: Missing `.env.example`
- **Files**: Root directory
- **Problem**: No `.env.example` documenting required env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `PAYMONGO_SECRET_KEY`, etc.).
- **Fix**: Create `.env.example` with all required env vars documented.

### 🟢 Low — Housekeeping

#### Issue 14: Junk files at repo root
- **Files**: `setSidebarOpen(true)}`, `setSoundEnabled(!soundEnabled)}`, `git`
- **Problem**: Empty artifact files from accidental keystrokes.
- **Fix**: Delete them.

#### Issue 15: `formatPrice` locale ambiguity
- **File**: `src/lib/pricing.js:22`
- **Problem**: `amount.toLocaleString()` with no locale.
- **Fix**: Pin to `'en-PH'` for consistency with `₱`.

#### Issue 16: Source maps in production build
- **File**: `vite.config.js`
- **Problem**: `sourcemap: true` can leak source on public CDN.
- **Fix**: Set `sourcemap: false` in production build.

---

## 11. Resolved Issues

The following 7 issues from the original audit have been fixed:

| # | Issue | Severity | Status |
| --- | --- | --- | --- |
| 1 | Edge function IDOR (no ownership check) | 🔴 Critical | ✅ Resolved — JWT verification + ownership check added to all 4 edge functions |
| 2 | PayMongo webhook no signature verification | 🔴 Critical | ✅ Resolved — HMAC verification using `PAYMONGO_WEBHOOK_SECRET` |
| 5 | Expired-user redirect loop on `/billing` | 🟠 High | ✅ Resolved — `ProtectedRoute` guards with `location.pathname !== "/billing"` |
| 6 | SubscriptionManager calls non-existent function | 🟠 High | ✅ Resolved — Corrected to `create-checkout` |
| 7 | AuthCallback uses `.single()` (new-user crash) | 🟠 High | ✅ Resolved — Changed to `.maybeSingle()` |
| 8 | Webhook marks changes applied prematurely | 🟠 High | ✅ Resolved — Only marks applied inside effective-date branch |
| 10 | Register.jsx broken hook copy | 🟡 Medium | ✅ Resolved — Removed local `useBrandFonts`, uses `useAuth` directly |

See `docs/TURNOVER_BILLING_FIX.md` for full details on fixes #1, #2, and #8.

---

## 12. What's Done Well

- **Single Supabase client instance** — service-role client excluded from client bundle.
- **Secrets in env** — read from `Deno.env` / `import.meta.env`, not hardcoded.
- **Retry-safe onboarding** — `HotelSetup` uses `upsert`/`maybeSingle`.
- **Realtime messaging** — guest portal receives admin replies live.
- **Guest sessions** — short-lived (24h) with token-based identity.
- **QR generation** — functional bulk QR download with jszip.
- **Error handling** — `ErrorBoundary` wraps billing; `ProtectedRoute` handles expired/payment-stuck states.
- **Edge function JWT verification** — now validates ownership before writes.

---

## Recommended priority order

1. **#3** — Migrations + RLS (biggest security gap)
2. **#4** — Stop persisting WiFi passwords in localStorage
3. **#9** — Refactor Dashboard.jsx timer/DOM manipulation
4. **#11** — Remove dead code and unused dependencies
5. **#12** — Centralize pricing constant
6. **#13** — Create `.env.example`
7. **#14–#16** — Junk files, locale, source maps

---

> Supabase project reference: `kdfhreavgdbuhqvecfeg`
