// src/lib/guestUrl.js
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
