# Room Lifecycle (Check-in / Extend / Check-out)

## Overview

The core product loop lives in `src/components/dashboard/Dashboard.jsx`. A room
moves through a status state machine driven by bookings. The dashboard fetches
rooms (with their active booking), computes status, and renders a grid/list
with timers that tick every second.

## Room status state machine

```
            ┌─────────────┐
            │  available  │
            └──────┬──────┘
       check-in    │
            ┌──────▼──────┐
            │  occupied   │◄──── extend (adds hours, +price)
            └──────┬──────┘
       check-out   │
            ┌──────▼──────┐
            │  cleaning   │
            └──────┬──────┘
   mark available  │
            └──────┬──────┘
                   └────────────► available

   Transient/derived states (computed, not stored):
     - expiring : occupied and end_time within ~X of now
     - expired  : occupied and end_time passed
     - booked   : has a future booking
```

## Key data flow in `Dashboard.jsx`

On mount (when `hotel.id` exists), `Dashboard` runs:

- `fetchRooms()` — loads rooms + active bookings, computes per-room status and
  dashboard stats (available/occupied/expiring/expired/cleaning/booked counts
  and occupancy rate).
- `fetchHotelSettings()` — loads hotel (WiFi password, menu) + pricing map.
- `fetchMessages()` — loads room messages + unread counts.
- `fetchActivityLogs()` — recent `activity_logs`.
- `fetchDashboardMetrics()` — totals from `revenue_summary` (revenue, check-ins,
  active bookings).

A `setInterval` increments `timerTick` every second; an effect then writes
countdown text directly into `[data-timer]` DOM nodes and recolors them by
status. (This direct-DOM approach is flagged in the audit as fragile — see
[known-issues.md](./known-issues.md) #9.)

## Check-in (`handleCheckin`)

1. Compute `start_time = now`, `end_time = now + hours`.
2. Insert a `bookings` row (`room_id`, `hotel_id`, `guest_name`, times, `hours`,
   `price`, `status: "active"`, `checked_in_at`).
3. Update the room to `status: "occupied"` (and set `room_type`).
4. `logActivity("checkin", ...)`.
5. Refetch rooms, metrics, and messages.

> Note: `roomService.checkin` in `src/services/roomService.js` is an alternative
> implementation (used elsewhere) that logs activity via a local helper. The
> Dashboard currently inlines its own check-in logic rather than calling the
> service.

## Extend (`handleExtend`)

1. Fetch the booking's current `end_time`/`hours`/`price`.
2. `newEndTime = end_time + additionalHours`; update `bookings`
   (`end_time`, `hours`, `price`).
3. Call `supabase.rpc('add_extension_revenue', { p_hotel_id, p_additional_price })`
   to add the extension revenue to `revenue_summary`.
4. `logActivity("extend", ...)`.
5. Refetch rooms + metrics.

## Check-out (`handleCheckout`)

1. Update the booking `status: "completed"`, set `checked_out_at`.
   - Revenue is **not** subtracted — completed bookings keep their revenue in
     `revenue_summary` (a DB trigger handles analytics).
2. Update the room `status: "cleaning"`.
3. Delete the room's `messages` (clears the guest chat).
4. `logActivity("checkout", ...)`.
5. Refetch rooms, metrics, messages.

## Other room actions

- **Mark available** (`handleMarkAvailable`) — `cleaning` → `available`.
- **Reset totals** (`handleResetTotals`) — calls `supabase.rpc` to zero the
  hotel's dashboard metrics.
- **Save prices** (`savePrices`) — upserts `pricing` rows keyed by
  `(hotel_id, duration_hours, room_type)`.
- **Update WiFi** (`updateWifiPassword`) — updates `hotels.wifi_password`.
- **Menu upload/remove** (`handleMenuUpload`/`handleMenuRemove`) — uploads to
  Supabase Storage and inserts/removes `menu_images` rows.
- **Send message** (`handleSendMessage`) — inserts an `admin` message for a room.

## Supporting UI

- `RoomGrid.jsx` / `RoomList.jsx` — two views of rooms (toggle via `view`).
- `StatsCards.jsx` — summary stat cards.
- `Sidebar.jsx` / `TopBar.jsx` — navigation + global actions (logout, sound
  toggle, open panels).
- `modals/` — `CheckinModal`, `CheckoutModal`, `ExtendModal`, `MenuModal`,
  `PriceModal`, `QRModal`, `WifiModal` drive the above actions.
- `settings/` — `RoomDetailPanel`, `SettingsPanel`, `MessagesPanel`,
  `ActivityPanel`, `CalendarManager` (rich room management).
- `analytics/AnalyticsPanel.jsx`, `reports/ReportsPanel.jsx` — insights.
- `dashboard/QRDownload.jsx` — bulk QR generation (uses `qrcode` + `jszip`).
- `dashboard/SubscriptionManager.jsx` — in-dashboard subscribe entrypoint.
