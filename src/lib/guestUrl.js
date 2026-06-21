// src/lib/guestUrl.js
//
// Single source of truth for building and parsing the guest portal URL.
//
// IMPORTANT — why this does NOT use URLSearchParams to build the URL:
// URLSearchParams.set() encodes spaces as "+" (the application/x-www-form
// -urlencoded convention used by HTML forms). That's correct for a normal
// browser address bar, which decodes "+" back to a space before handing
// the query string to your router — which is why this looked fine on
// desktop. But a URL embedded in a QR code is read by a camera app and
// handed to the OS as a generic URI, not submitted as a form. The URI
// spec (RFC 3986) does NOT define "+" as meaning space — only form
// encoding does. Many mobile camera-to-browser intent handoffs parse the
// QR payload as a plain URI and never apply the form-decode step, so
// "+" can arrive as a literal character (or worse, destabilize how the
// "&" delimiters are re-parsed during the handoff) ONLY on the mobile
// scan path — exactly matching "works on desktop, fails when scanned".
//
// Fix: encode manually with encodeURIComponent, which always emits %20
// for a space. %20 is unambiguous in every context — form-encoded query
// string, plain URI, QR payload — so it survives every parsing pass.

/**
 * Build the guest portal URL for a room. Encodes manually with
 * encodeURIComponent (NOT URLSearchParams) so spaces become %20, not "+".
 */
export function buildGuestUrl(hotelId, roomId, roomName) {
  const base = `${window.location.origin}/guest`;
  const roomPart = encodeURIComponent(`${hotelId}_${roomId}`);
  let url = `${base}?room=${roomPart}`;
  if (roomName) {
    url += `&name=${encodeURIComponent(roomName)}`;
  }
  return url;
}

/**
 * Parse the `room` query param into { hotelId, roomId }.
 *
 * The caller must pass the value exactly as returned by
 * `useSearchParams().get("room")` — that value is already decoded by the
 * router. Do not call decodeURIComponent on it again under normal
 * circumstances; this function only re-decodes defensively if the value
 * still looks percent-encoded (handles odd mobile handoff cases without
 * risking a double-decode on the normal path).
 */
export function parseRoomParam(param) {
  if (!param) return null;

  let value = param;

  if (/%[0-9A-Fa-f]{2}/.test(value)) {
    try {
      value = decodeURIComponent(value);
    } catch (e) {
      console.warn("parseRoomParam: failed to decode, using raw value", e);
      value = param;
    }
  }

  if (value.includes("_")) {
    const parts = value.split("_");
    if (parts.length === 2) {
      return { hotelId: parts[0], roomId: parts[1] };
    }
    const hotelId = parts.slice(0, parts.length - 1).join("_");
    const roomId = parts[parts.length - 1];
    return { hotelId, roomId };
  }

  return { roomId: value };
}
