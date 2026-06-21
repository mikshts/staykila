// src/lib/guestUrl.js
//
// Single source of truth for building and parsing the guest portal URL.
// Previously this logic was duplicated (slightly differently) in
// GuestPortal.jsx, QRModal.jsx, QRDownload.jsx, and Dashboard.jsx —
// that duplication is how the mobile-scan bug crept in: each copy
// encoded/decoded the room param a little differently.
//
// `room` is always `${hotelId}_${roomId}` where hotelId/roomId are UUIDs
// (no underscores in a UUID, so splitting on "_" is safe — but we still
// guard against malformed input below).

/**
 * Build the guest portal URL for a room. Always uses URLSearchParams so the
 * browser's own encoder handles escaping — never hand-interpolate "%20" etc.
 */
export function buildGuestUrl(hotelId, roomId, roomName) {
  const url = new URL("/guest", window.location.origin);
  url.searchParams.set("room", `${hotelId}_${roomId}`);
  if (roomName) {
    url.searchParams.set("name", roomName);
  }
  return url.toString();
}

/**
 * Parse the `room` query param into { hotelId, roomId }.
 *
 * IMPORTANT: the caller must pass the value exactly as returned by
 * `useSearchParams().get("room")` (or `URLSearchParams.get`) — that value
 * is ALREADY decoded. Do not call decodeURIComponent on it again.
 *
 * Mobile QR-scanner-to-browser handoffs (camera app -> "open in Chrome/
 * Safari" intent) sometimes deliver a query string that has already been
 * percent-decoded once by the OS/scanner before the page's router ever
 * sees it, while desktop "paste URL into address bar" does not. Calling
 * decodeURIComponent unconditionally on top of that double-decodes (or
 * throws a URIError on certain malformed input) ONLY on the mobile path —
 * which is exactly the symptom reported ("works on desktop, fails on
 * mobile"). This function never decodes; it trusts the router's decode
 * and defensively re-derives if the string still looks percent-encoded.
 */
export function parseRoomParam(param) {
  if (!param) return null;

  let value = param;

  // Defensive: if the string still contains a percent-encoded sequence
  // (e.g. some mobile handoffs deliver "room" un-decoded even though
  // useSearchParams usually decodes it), decode it exactly once. If it's
  // already decoded (the normal case), this is a safe no-op.
  if (/%[0-9A-Fa-f]{2}/.test(value)) {
    try {
      value = decodeURIComponent(value);
    } catch (e) {
      // Malformed percent-encoding (can happen with double-encoding from
      // some camera-app browser handoffs). Fall back to the raw value
      // rather than throwing and breaking the whole load.
      console.warn("parseRoomParam: failed to decode, using raw value", e);
      value = param;
    }
  }

  if (value.includes("_")) {
    const parts = value.split("_");
    if (parts.length === 2) {
      return { hotelId: parts[0], roomId: parts[1] };
    }
    // Hotel ID itself shouldn't contain "_" for UUIDs, but stay defensive
    // in case of legacy/non-UUID IDs.
    const hotelId = parts.slice(0, parts.length - 1).join("_");
    const roomId = parts[parts.length - 1];
    return { hotelId, roomId };
  }

  return { roomId: value };
}
