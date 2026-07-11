# StayKila Codebase Summary

> Generated: 2026-07-11
> Scope: `src/` (React client) and `supabase/functions/` (Deno edge functions)
> Stack: React 18 + Vite 4, Supabase (Postgres + Auth + Realtime + Edge Functions), PayMongo payments, Tailwind CSS.

This directory is a categorized, human-readable summary of the StayKila codebase.
Each file covers one concern so you can jump straight to what you need.

## What is StayKila?

StayKila is a hotel / lodge management web app. A property owner registers a
"hotel" (a single property), gets a grid of rooms, and manages short-stay
bookings (check-in, extend, check-out), pricing, guest messaging, and a public
guest portal (QR-code entry, WiFi, menu, chat). Revenue is collected via a
PayMongo-backed monthly subscription billed per room.

## Categories (see each file)

| File | What it covers |
| --- | --- |
| [architecture.md](./architecture.md) | High-level layers, tech stack, directory map, data model. |
| [authentication.md](./authentication.md) | Auth flow, session, route protection, hotel setup. |
| [room-lifecycle.md](./room-lifecycle.md) | Check-in / extend / check-out flow and the booking/room state machine. |
| [guest-portal.md](./guest-portal.md) | Public guest experience, QR codes, messaging, caching. |
| [billing-subscriptions.md](./billing-subscriptions.md) | Subscription, checkout, webhook, room-count changes, payment flow. |
| [data-model.md](./data-model.md) | Supabase tables, relationships, and key columns. |
| [key-files.md](./key-files.md) | Map of important source files and their responsibilities. |
| [known-issues.md](./known-issues.md) | Security and functional issues carried over from the codebase audit. |

## Top-level directory map

```
staykila/
├── docs/                      # Documentation (this summary + CODEBASE_AUDIT.md)
├── public/                    # Static assets
├── src/
│   ├── components/            # UI by feature (auth, billing, dashboard, guest, ...)
│   ├── contexts/              # React context providers (AuthContext)
│   ├── hooks/                 # useSubscription, usePayments, useBrandFonts
│   ├── lib/                   # supabase client, pricing config, guest URL helpers
│   ├── pages/                 # LandingPage, PricingPage
│   ├── services/              # roomService, messageService (data access helpers)
│   ├── utils/                 # (empty)
│   ├── App.jsx                # Router + route definitions
│   ├── main.jsx               # React entry point
│   └── sound.js               # Web Audio alert tones
├── supabase/
│   └── functions/             # Deno edge functions (create-checkout, webhook, ...)
└── package.json               # Dependencies & scripts
```

## Request lifecycle (simplified)

1. Browser loads `src/main.jsx` → renders `<App/>`.
2. `<App/>` wraps everything in `<BrowserRouter>` + `<AuthProvider>`.
3. Routes are guarded by `<ProtectedRoute>`, which reads auth + subscription state.
4. Authenticated users land on `<Dashboard>` (the main management screen).
5. Mutations go straight to Supabase (Postgres) via the anon client, or to a
   Deno edge function (for billing actions that need the service-role key).
6. The guest portal (`/guest`) is public and keyed by a `room` query param.
