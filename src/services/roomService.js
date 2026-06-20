// src/services/roomService.js
import { supabase } from "../lib/supabase";

export const roomService = {
  // Get all rooms for a hotel
  async getRooms(hotelId) {
    const { data, error } = await supabase
      .from("rooms")
      .select(
        `
        *,
        bookings:bookings(
          id,
          start_time,
          end_time,
          hours,
          price,
          status
        )
      `,
      )
      .eq("hotel_id", hotelId)
      .eq("bookings.status", "active")
      .order("room_number");

    if (error) throw error;
    return data;
  },

  // Get room by ID
  async getRoom(roomId) {
    const { data, error } = await supabase
      .from("rooms")
      .select(
        `
        *,
        bookings:bookings(
          id,
          start_time,
          end_time,
          hours,
          price,
          status
        )
      `,
      )
      .eq("id", roomId)
      .single();

    if (error) throw error;
    return data;
  },

  // Check-in guest
  async checkin(roomId, hotelId, hours, price) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + hours * 3600000);

    // Start a transaction
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        room_id: roomId,
        hotel_id: hotelId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        hours: hours,
        price: price,
        status: "active",
        checked_in_at: startTime.toISOString(),
      })
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Update room status
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", roomId);

    if (roomError) throw roomError;

    // Log activity
    await logActivity(
      hotelId,
      "checkin",
      `Checked into room ${roomId} for ${hours}h`,
    );

    return booking;
  },

  // Extend stay
  async extendStay(bookingId, additionalHours, additionalPrice) {
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("end_time, hours, price")
      .eq("id", bookingId)
      .single();

    if (fetchError) throw fetchError;

    const newEndTime = new Date(booking.end_time);
    newEndTime.setHours(newEndTime.getHours() + additionalHours);

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        end_time: newEndTime.toISOString(),
        hours: booking.hours + additionalHours,
        price: booking.price + additionalPrice,
      })
      .eq("id", bookingId);

    if (updateError) throw updateError;

    return { success: true };
  },

  // Checkout
  async checkout(bookingId, roomId) {
    // Update booking
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: "completed",
        checked_out_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (bookingError) throw bookingError;

    // Update room to cleaning
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "cleaning" })
      .eq("id", roomId);

    if (roomError) throw roomError;

    // Clear messages
    await clearMessages(roomId);

    return { success: true };
  },

  // Clear messages for room
  async clearMessages(roomId) {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("room_id", roomId);

    if (error) throw error;
    return { success: true };
  },

  // Rename room
  async renameRoom(roomId, newName) {
    const { error } = await supabase
      .from("rooms")
      .update({ name: newName })
      .eq("id", roomId);

    if (error) throw error;
    return { success: true };
  },

  // Update room notes
  async updateNotes(roomId, notes) {
    const { error } = await supabase
      .from("rooms")
      .update({ notes })
      .eq("id", roomId);

    if (error) throw error;
    return { success: true };
  },

  // Mark room as available (after cleaning)
  async markAvailable(roomId) {
    const { error } = await supabase
      .from("rooms")
      .update({ status: "available" })
      .eq("id", roomId);

    if (error) throw error;
    return { success: true };
  },

  // Mark room for cleaning
  async markCleaning(roomId) {
    const { error } = await supabase
      .from("rooms")
      .update({ status: "cleaning" })
      .eq("id", roomId);

    if (error) throw error;
    return { success: true };
  },
};

// Helper: Log activity
async function logActivity(hotelId, actionType, description) {
  const { error } = await supabase.from("activity_logs").insert({
    hotel_id: hotelId,
    action_type: actionType,
    description: description,
  });

  if (error) console.error("Failed to log activity:", error);
}
