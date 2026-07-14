// src/services/ratingService.js
import { supabase } from "../lib/supabase";

export const ratingService = {
  // Average rating + count for a hotel (used by the sidebar badge)
  async getHotelAverage(hotelId) {
    if (!hotelId) return { average: 0, count: 0 };
    const { data, error } = await supabase
      .from("ratings")
      .select("rating")
      .eq("hotel_id", hotelId);
    if (error) throw error;
    const count = data?.length || 0;
    const average = count
      ? data.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;
    return { average, count };
  },
};
