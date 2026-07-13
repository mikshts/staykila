// src/services/messageService.js
import { supabase } from "../lib/supabase";

export const messageService = {
  // Get messages for a room
  async getMessages(roomId) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  // Send message (admin)
  async sendAdminMessage(roomId, hotelId, message, userId) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        hotel_id: hotelId,
        sender: "admin",
        sender_id: userId,
        message: message,
        is_read: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Send message (guest)
  async sendGuestMessage(roomId, hotelId, message, guestToken) {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        room_id: roomId,
        hotel_id: hotelId,
        sender: "guest",
        message: message,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mark message as read
  async markAsRead(messageId) {
    const { error } = await supabase
      .from("messages")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", messageId);

    if (error) throw error;
    return { success: true };
  },

  // Subscribe to new messages for a single room (Guest Portal).
  // Listens for INSERT, UPDATE and DELETE so edits/deletes/reads propagate.
  subscribeToRoom(roomId, callbacks) {
    const cb = normalizeCallbacks(callbacks);
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            cb.onDelete?.(payload.old);
          } else {
            cb.onChange?.(payload.new, payload.eventType);
          }
        },
      )
      .subscribe();

    return channel;
  },

  // Subscribe to ALL messages for a hotel (Dashboard).
  // A single channel covers every room in the hotel, so the dashboard updates
  // live when any guest (or admin) sends a message — no per-room channels,
  // no duplicate subscriptions.
  subscribeToHotel(hotelId, callbacks) {
    const cb = normalizeCallbacks(callbacks);
    const channel = supabase
      .channel(`hotel-messages-${hotelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `hotel_id=eq.${hotelId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            cb.onDelete?.(payload.old);
          } else {
            cb.onChange?.(payload.new, payload.eventType);
          }
        },
      )
      .subscribe();

    return channel;
  },
};

// Allow callers to pass either a single (newMsg) => void function (legacy) or
// an object of named callbacks. Keeps the existing GuestPortal call site
// working while letting the Dashboard use richer events.
function normalizeCallbacks(callbacks) {
  if (typeof callbacks === "function") {
    return { onChange: (row) => callbacks(row) };
  }
  return callbacks || {};
}

  // Create guest session
  async createGuestSession(roomId) {
    const token = crypto.randomUUID();

    const { data, error } = await supabase
      .from("guest_sessions")
      .insert({
        room_id: roomId,
        token: token,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { token, session: data };
  },

  // Validate guest session
  async validateGuestSession(token) {
    const { data, error } = await supabase
      .from("guest_sessions")
      .select("*")
      .eq("token", token)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error) return null;
    return data;
  },
};
