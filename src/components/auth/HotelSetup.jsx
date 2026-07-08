// src/components/auth/HotelSetup.jsx
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PRICING_CONFIG,
  calculateMonthlyPrice,
  calculateYearlyPrice,
} from "../../lib/pricing";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function HotelSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Read the room count from the URL query param (passed from AuthCallback)
  const [searchParams] = useSearchParams();
  const initialRooms = parseInt(searchParams.get("rooms"), 10) || 10;

  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    rooms: initialRooms,
  });

  // Safe handler for the room number input (prevents NaN)
  const handleRoomChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setFormData({
      ...formData,
      rooms: isNaN(val) ? 1 : Math.min(Math.max(val, 1), 300),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create hotel
      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .insert({
          name: formData.name,
          owner: formData.owner || user.user_metadata?.full_name || "Owner",
          email: user.email,
        })
        .select()
        .single();

      if (hotelError) throw hotelError;

      // 2. Create user record (links auth user to this hotel)
      const { error: userError } = await supabase.from("users").insert({
        id: user.id,
        hotel_id: hotel.id,
        full_name: formData.owner || user.user_metadata?.full_name || "Owner",
        role: "admin",
      });

      if (userError) throw userError;

      // 3. Create rooms
      const rooms = [];
      for (let i = 1; i <= formData.rooms; i++) {
        rooms.push({
          hotel_id: hotel.id,
          room_number: i,
          name: `Room ${i}`,
          status: "available",
          room_type: "single",
        });
      }

      const { error: roomsError } = await supabase.from("rooms").insert(rooms);
      if (roomsError) throw roomsError;

      // 4. Create default pricing for all room types
      const roomTypes = ["single", "double", "family"];
      const defaultPrices = {
        single: { 1: 100, 3: 250, 6: 450, 12: 800, 24: 1500 },
        double: { 1: 150, 3: 350, 6: 600, 12: 1000, 24: 1800 },
        family: { 1: 250, 3: 500, 6: 800, 12: 1300, 24: 2200 },
      };

      const pricing = [];
      roomTypes.forEach((roomType) => {
        Object.entries(defaultPrices[roomType]).forEach(([hours, price]) => {
          pricing.push({
            hotel_id: hotel.id,
            duration_hours: parseInt(hours),
            price: price,
            room_type: roomType,
          });
        });
      });

      const { error: pricingError } = await supabase
        .from("pricing")
        .insert(pricing);
      if (pricingError) throw pricingError;

      // 5. Create subscription with 30-day trial
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + PRICING_CONFIG.trialDays);

      const { error: subError } = await supabase.from("subscriptions").insert({
        hotel_id: hotel.id,
        room_count: formData.rooms,
        price_per_room: PRICING_CONFIG.pricePerRoom,
        monthly_amount: calculateMonthlyPrice(formData.rooms),
        yearly_amount: calculateYearlyPrice(formData.rooms),
        currency: PRICING_CONFIG.currencyCode,
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
        subscription_status: "trial",
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
      });

      if (subError) throw subError;

      toast.success("Hotel setup complete!");
      navigate("/");
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Failed to setup hotel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0f1b2d] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-hotel text-[#c9a84c] text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-[#0f1b2d]">Welcome!</h1>
          <p className="text-gray-500 text-sm">Set up your hotel profile</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Hotel Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="Sunset Beach Resort"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Owner / Manager Name
            </label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) =>
                setFormData({ ...formData, owner: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="Maria Santos"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Number of Rooms (1-300)
            </label>
            <input
              type="number"
              value={formData.rooms}
              onChange={handleRoomChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              min={1}
              max={300}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Pre‑filled from your pricing selection. You can adjust it now.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f1b2d] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? "Setting up..." : "Create Hotel"}
          </button>
        </form>
      </div>
    </div>
  );
}
