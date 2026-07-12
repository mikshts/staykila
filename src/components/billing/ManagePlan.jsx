// src/components/billing/ManagePlan.jsx
import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

export default function ManagePlan({
  currentRooms,
  currentAmount,
  pricePerRoom,
  pendingRooms,
  pendingAmount,
  pendingEffectiveDate,
  onClose,
  hotelId,
  onPlanChanged,
}) {
  const [rooms, setRooms] = useState(currentRooms);
  const [loading, setLoading] = useState(false);
  const [newAmount, setNewAmount] = useState(currentRooms * pricePerRoom);
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [hasPending] = useState(
    pendingRooms != null && pendingEffectiveDate != null,
  );

  const handleChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) return;
    setRooms(val);
    setNewAmount(val * pricePerRoom);
  };

  const handleSave = async () => {
    if (rooms === currentRooms) {
      toast.info("No change in room count.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-room-count`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hotelId, newRoomCount: rooms }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update plan");

      setEffectiveDate(data.effectiveDate);
      toast.success("Future plan scheduled successfully!");
      if (onPlanChanged) onPlanChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPending = async () => {
    if (!confirm("Cancel the scheduled future plan? Your current plan stays."))
      return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-room-count`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hotelId, action: "cancel" }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to cancel plan");

      toast.success("Scheduled future plan cancelled.");
      if (onPlanChanged) onPlanChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#0f1b2d] mb-4">
          Manage Plan
        </h2>

        {/* Current Plan */}
        <div className="bg-[#f7f3ee] rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8278]">
            Current Plan
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {currentRooms} rooms ·{" "}
            <span className="font-bold">₱{currentAmount.toLocaleString()}</span>{" "}
            / month
          </p>
        </div>

        {/* Scheduled Future Plan */}
        {hasPending && (
          <div className="bg-[#0f1b2d] text-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a84c]">
                Future Plan (Scheduled)
              </p>
              <button
                onClick={handleCancelPending}
                disabled={loading}
                className="text-xs text-red-300 hover:text-red-200 underline disabled:opacity-50">
                Cancel
              </button>
            </div>
            <p className="text-sm mt-1">
              {pendingRooms} rooms ·{" "}
              <span className="font-bold">
                ₱{pendingAmount.toLocaleString()}
              </span>{" "}
              / month
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Starts on {new Date(pendingEffectiveDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Change room count */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            New Number of Rooms
          </label>
          <input
            type="number"
            min="1"
            max="300"
            value={rooms}
            onChange={handleChange}
            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#c9a84c] focus:border-[#c9a84c]"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>1</span>
            <span>300</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600">
            New monthly total:{" "}
            <span className="font-bold">₱{newAmount.toLocaleString()}</span>
          </p>
          {effectiveDate && (
            <p className="text-xs text-gray-500 mt-1">
              Effective on {new Date(effectiveDate).toLocaleDateString()}
            </p>
          )}
          {!effectiveDate && (
            <p className="text-xs text-gray-500 mt-1">
              Takes effect at the end of your current billing period.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={loading || rooms === currentRooms}
            className="flex-1 bg-[#0f1b2d] text-white px-4 py-2 rounded-lg hover:bg-[#1a2d4a] transition disabled:opacity-50">
            {loading ? "Saving..." : "Schedule Change"}
          </button>
        </div>
      </div>
    </div>
  );
}
