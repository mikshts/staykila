# Guest Portal

## Overview

The guest portal is a **public** screen at `/guest` that a staying guest opens
(usually via a QR code printed on/near the room). It is keyed by a `room` query
parameter and shows the room's live status, a countdown timer, WiFi details,
the hotel menu, and a two-way chat with the property.

## URL format

Built by `src/lib/guestUrl.js`:

- `buildGuestUrl(hotelId, roomId, roomName)` →
  `/guest?room=<hotelId>_<roomId>&name=<roomName>`
- `parseRoomParam(param)` → `{ hotelId, roomId }` (splits on `_`, defensively
  re-decodes if still percent-encoded).

The QR codes generated in `dashboard/QRDownload.jsx` and `modals/QRModal.jsx`
encode this URL.

## Files

- `src/components/guest/GuestPortal.jsx` — the entire guest experience (~1090 lines).
- `src/components/guest/ImageViewer.jsx` — full-screen menu image viewer.
- `src/services/roomService.js` — `getRoom(roomId)` data fetch.
- `src/services/messageService.js` — messages + guest sessions + realtime.
- `src/lib/guestUrl.js` — URL build/parse helpers.

## Load flow (`loadRoomData`)

1. Parse `room` param → `hotelId`, `roomId`.
2. **Cache first:** read `localStorage["guest_room_<roomId>"]`. If present,
   immediately render cached `room`, `hotel`, `wifiPassword`, `menuImages`, and
   compute `timeRemaining` from the cached booking. This gives an instant,
   offline-friendly first paint.
3. **Fresh fetch:** load the room (via `roomService.getRoom`), the hotel
   (for WiFi + menu), active booking, menu images, and messages.
4. **Guest session:** if no `guest_<roomId>_token` in `localStorage`, create one
   via `messageService.createGuestSession` (inserts a `guest_sessions` row with
   a 24h expiry) and persist the token.
5. **Realtime:** subscribe to `postgres_changes` on `messages` filtered by
   `room_id` so new admin/guest messages appear live.
6. **Re-cache:** write the fetched payload back to
   `localStorage["guest_room_<roomId>"]`.

## Guest features

- **Live countdown** of the active booking's `end_time`.
- **WiFi modal** (`showWifi`) — reveals `hotels.wifi_password`.
- **Menu** — `menu_images` gallery with `ImageViewer`.
- **Quick actions / chat** — pre-written messages (e.g. "Need towels",
  "Room service") and free-text chat via `messageService.sendGuestMessage`
  (`sender: "guest"`, `is_read: false`). Admin replies appear via the realtime
  subscription.
- **Offline handling** — if the fetch fails and the browser is offline, the
  cached data keeps rendering and `isOffline` is set.

## ⚠️ Security note (important)

`GuestPortal` caches the **entire room payload including `wifiPassword`** into
`localStorage` (`guest_room_<roomId>`), and persists the guest session token
there too. Any script running in the page (or a subsequent user on a shared
device) can read the WiFi password and the guest token. The audit flags this as
a critical issue — see [known-issues.md](./known-issues.md) #4. Recommended fix:
don't persist secrets to `localStorage`; fetch on load and keep in memory, or
exclude `wifiPassword` from the cache.
