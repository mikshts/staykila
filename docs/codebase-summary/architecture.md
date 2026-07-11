# Architecture

## Layers

StayKila is a **client-heavy SPA** with a thin backend implemented entirely as
Supabase (managed Postgres + Auth + Realtime + Edge Functions). There is no
custom application server.

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                         │
│  - AuthContext (session + hotel)                             │
│  - Hooks (useSubscription, usePayments)                      │
│  - Pages / Components / Services                             │
│  - Single anon Supabase client (src/lib/supabase.js)         │
└───────────────┬───────────────────────────┬─────────────────┘
                │ anon key (browser)         │ service-role key (server-only)
                ▼                            ▼
        ┌───────────────────┐      ┌──────────────────────────┐
        │  Supabase Postgres │      │  Deno Edge Functions      │
        │  + Auth + Realtime │      │  (create-checkout,        │
        │                   │      │   cancel-subscription,     │
        │  RLS (none today) │      │   change-room-count,       │
        │                   │      │   paymongo-webhook)        │
        └───────────────────┘      └───────────┬──────────────┘
                                                │ HTTPS
                                                ▼
                                        ┌──────────────────┐
                                        │  PayMongo API     │
                                        │  (checkout, cards,│
                                        │   GCash, PayMaya) │
                                        └──────────────────┘
```

## Tech stack

- **React 18** + **Vite 4** (build/dev server, `vite.config.js`).
- **react-router-dom v6** for routing.
- **@supabase/supabase-js v2** for DB, Auth, and Realtime.
- **Tailwind CSS v3** for styling (theme accent `#c9a84c`, navy `#0f1b2d`).
- **react-hot-toast** for notifications.
- **framer-motion** (declared), **react-calendar**, **qrcode** / **qrcode.react**
  (QR generation), **jszip** (bulk QR download).
- **PayMongo** for payments, called from Deno edge functions.

## Client entry points

- `src/main.jsx` — mounts `<App/>`, imports global CSS + Font Awesome.
- `src/App.jsx` — defines all routes and wraps them in `AuthProvider`.
- `src/lib/supabase.js` — the **single** Supabase client instance using the
  anon key. The service-role client is commented out (correctly) so the secret
  never ships to the browser.

## Directory responsibilities

- `src/contexts/AuthContext.jsx` — holds `user`, `hotel`, and exposes
  `login`, `register`, `logout`. On session change it fetches the user's
  `hotel_id` then the hotel row.
- `src/hooks/` — derived/stateful data:
  - `useSubscription` — current subscription + computed flags (`isTrial`,
    `isActive`, `isExpired`, `isExpiringSoon`, days remaining).
  - `usePayments` — payment history for the hotel.
  - `useBrandFonts` — injects Google Fonts link (used by some screens).
- `src/lib/` — `supabase.js` (client), `pricing.js` (price config + helpers),
  `guestUrl.js` (build/parse guest room URLs).
- `src/services/` — `roomService.js` and `messageService.js` are thin data
  helpers around the Supabase client (used by Dashboard and GuestPortal).
- `src/components/` — feature folders: `auth`, `billing`, `dashboard`,
  `guest`, `analytics`, `pricing`, `reports`, `settings`, `common`, `modals`,
  `ui`, `layout` (empty), plus `ErrorBoundary.jsx`.

## Backend (edge functions)

All under `supabase/functions/`, each a Deno `serve` handler using the
**service-role** key:

- `create-checkout` — builds a PayMongo checkout session for a hotel's plan.
- `cancel-subscription` — flags `cancel_at_period_end` on the subscription.
- `change-room-count` — schedules a pending room-count change.
- `paymongo-webhook` — receives PayMongo events and activates subscriptions /
  records payments.

> Note: There are **no SQL migrations** in the repo. Tables (`hotels`,
> `rooms`, `bookings`, `subscriptions`, `subscription_changes`, `payments`,
> `messages`, `guest_sessions`, `menu_images`, `activity_logs`, `pricing`,
> `revenue_summary`, `users`) exist only in the deployed database. See
> [known-issues.md](./known-issues.md).

## Styling / theme

- Primary navy: `#0f1b2d`
- Accent gold: `#c9a84c`
- Guest/landing screens use a dark navy background; billing uses a warm
  `#f7f3ee` background.
- Tailwind config in `tailwind.config.js`; PostCSS in `postcss.config.js`.
