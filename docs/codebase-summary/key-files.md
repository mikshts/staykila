# Key Files Reference

A map of the most important source files and what each is responsible for.

## Entry & routing

| File | Responsibility |
| --- | --- |
| `src/main.jsx` | React root, mounts `<App/>`, global CSS + Font Awesome. |
| `src/App.jsx` | Router, route table, `AuthProvider` wrapper, toaster. |
| `src/index.css` / `src/App.css` | Global + component styles. |

## Auth & contex
| File | Responsibility |
| --- | --- |
| `src/contexts/AuthContext.jsx` | Session, `user`, `hotel`; `login`/`register`/`logout`; `fetchHotel`. |
| `src/contexts/HotelContext.jsx` | Legacy hotel context (appears unused; `useAuth` is used instead). |
| `src/components/auth/Login.jsx` | Email/password sign-in. |
| `src/components/auth/Register.jsx` | Property registration form. |
| `src/components/auth/AuthCallback.jsx` | OAuth redirect handler. |
| `src/components/auth/HotelSetup.jsx` | Create/link hotel, rooms, pricing, trial subscription. |
| `src/components/auth/ProtectedRoute.jsx` | Route guard (auth + subscription state). |

## Dashboard (core product)

| File | Responsibility |
| --- | --- |
| `src/components/dashboard/Dashboard.jsx` | Main management screen; room fetch, check-in/out/extend, stats, timers. |
| `src/components/dashboard/RoomGrid.jsx` | Grid view of rooms. |
| `src/components/dashboard/RoomList.jsx` | List view of rooms. |
| `src/components/dashboard/StatsCards.jsx` | Summary stat cards. |
| `src/components/dashboard/Sidebar.jsx` / `TopBar.jsx` | Navigation + global actions. |
| `src/components/dashboard/SubscriptionManager.jsx` | In-dashboard subscribe entrypoint. |
| `src/components/dashboard/QRDownload.jsx` | Bulk QR generation (qrcode + jszip). |

## Modals & settings

| File | Responsibility |
| --- | --- |
| `src/components/modals/CheckinModal.jsx` | Check-in form. |
| `src/components/modals/CheckoutModal.jsx` | Check-out confirm. |
| `src/components/modals/ExtendModal.jsx` | Extend stay. |
| `src/components/modals/MenuModal.jsx` / `WifiModal.jsx` / `PriceModal.jsx` / `QRModal.jsx` | Menu/WiFi/price/QR dialogs. |
| `src/components/settings/RoomDetailPanel.jsx` | Room detail editing. |
| `src/components/settings/SettingsPanel.jsx` | Hotel settings (WiFi, etc.). |
| `src/components/settings/MessagesPanel.jsx` | Admin message view. |
| `src/components/settings/ActivityPanel.jsx` | Activity log view. |
| `src/components/settings/CalendarManager.jsx` | Booking calendar. |
| `src/components/analytics/AnalyticsPanel.jsx` | Analytics. |
| `src/components/reports/ReportsPanel.jsx` | Reports. |

## Guest portal

| File | Responsibility |
| --- | --- |
| `src/components/guest/GuestPortal.jsx` | Public guest experience (status, WiFi, menu, chat). |
| `src/components/guest/ImageViewer.jsx` | Full-screen menu image viewer. |

## Billing

| File | Responsibility |
| --- | --- |
| `src/components/billing/BillingPage.jsx` | Plan summary, subscribe, cancel, payment history. |
| `src/components/billing/ManagePlan.jsx` | Change room count. |
| `src/components/billing/BillingCard.jsx` / `TrialBanner.jsx` | Billing UI pieces. |

## Hooks, lib, services

| File | Responsibility |
| --- | --- |
| `src/hooks/useSubscription.js` | Subscription state + derived flags. |
| `src/hooks/usePayments.js` | Payment history. |
| `src/hooks/useBrandFonts.js` | Inject Google Fonts link. |
| `src/lib/supabase.js` | Single anon Supabase client. |
| `src/lib/pricing.js` | Price config + helpers (`PRICE_PER_ROOM = 30`). |
| `src/lib/guestUrl.js` | Build/parse guest room URLs. |
| `src/services/roomService.js` | Room/booking data helpers. |
| `src/services/messageService.js` | Messages, guest sessions, realtime subscription. |
| `src/sound.js` | Web Audio alert tones (expiring/urgent). |

## Edge functions (Deno, service-role)

| File | Responsibility |
| --- | --- |
| `supabase/functions/create-checkout/index.ts` | Create PayMongo checkout session. |
| `supabase/functions/cancel-subscription/index.ts` | Set `cancel_at_period_end`. |
| `supabase/functions/change-room-count/index.ts` | Schedule pending room-count change. |
| `supabase/functions/paymongo-webhook/index.ts` | Receive PayMongo events, activate subscription. |

## Pages

| File | Responsibility |
| --- | --- |
| `src/pages/LandingPage.jsx` | Marketing/entry page (route `/login`). |
| `src/pages/PricingPage.jsx` | Public pricing page (route `/pricing`). |
