// src/components/modals/CheckinModal.jsx
import React, { useState } from "react";

export default function CheckinModal({
  room,
  prices,
  onCheckin,
  onClose,
  formatTime,
}) {
  const [selectedRoomType, setSelectedRoomType] = useState("single");

  // Room type definitions (no multiplier)
  const roomTypes = [
    {
      id: "single",
      label: "Single Bed",
      icon: "🛏️",
      description: "1 person · Standard room",
    },
    {
      id: "double",
      label: "Double Bed",
      icon: "🛏️🛏️",
      description: "2 persons · Queen/King bed",
    },
    {
      id: "family",
      label: "Family Room",
      icon: "🏠",
      description: "4-6 persons · Multiple beds",
    },
  ];

  const durations = [
    { hours: 1, label: "1 Hour", note: "Quick rest", icon: "🌙" },
    { hours: 3, label: "3 Hours", note: "Short stay", icon: "☕" },
    { hours: 6, label: "6 Hours", note: "Half day", icon: "🏠" },
    { hours: 12, label: "12 Hours", note: "Day use", icon: "🌅" },
    { hours: 24, label: "Overnight", note: "24 hours", icon: "🌛" },
  ];

  // Get price for specific room type and duration
  const getPrice = (hours) => {
    // Try to get room type specific price first
    const key = `${selectedRoomType}_${hours}`;
    if (prices[key] !== undefined && prices[key] !== null && prices[key] > 0) {
      return prices[key];
    }
    // Fallback to base price (for backward compatibility)
    return prices[hours] || hours * 100;
  };

  // Get room type label for display
  const getRoomTypeLabel = () => {
    const selected = roomTypes.find((t) => t.id === selectedRoomType);
    return selected ? selected.label : "Single Bed";
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#0f1b2d] rounded-xl flex items-center justify-center text-[#c9a84c]">
            <i className="fas fa-key"></i>
          </div>
          <div>
            <h3 className="font-bold text-[#0f1b2d]">Check In</h3>
            <p className="text-xs text-[#8a8278]">{room?.name}</p>
          </div>
        </div>

        {/* Room Type Selection */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
            Select Room Type
          </p>
          <div className="grid grid-cols-3 gap-2">
            {roomTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedRoomType(type.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${
                  selectedRoomType === type.id
                    ? "border-[#c9a84c] bg-[#c9a84c]/10 shadow-md"
                    : "border-[#e5e2db] hover:border-[#c9a84c] hover:bg-[#f7f3ee]"
                }`}>
                <div className="text-2xl">{type.icon}</div>
                <div className="text-[10px] font-semibold mt-1">
                  {type.label}
                </div>
                <div className="text-[8px] text-[#8a8278] mt-0.5">
                  {type.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {durations.map((d) => {
            const price = getPrice(d.hours);

            return (
              <button
                key={d.hours}
                onClick={() =>
                  onCheckin(room.id, d.hours, price, selectedRoomType)
                }
                className="w-full flex items-center gap-3 p-3 bg-[#f7f3ee] rounded-xl hover:border-[#c9a84c] border-2 border-transparent transition">
                <span className="text-xl">{d.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{d.label}</div>
                  <div className="text-xs text-[#8a8278]">{d.note}</div>
                  <div className="text-[10px] text-[#0f1b2d] mt-0.5">
                    <span className="bg-[#c9a84c]/20 px-2 py-0.5 rounded-full">
                      {getRoomTypeLabel()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#c9a84c]">₱{price}</div>
                  <div className="text-[10px] text-[#8a8278] mt-0.5">
                    {formatTime(new Date().toISOString())} →{" "}
                    {formatTime(
                      new Date(Date.now() + d.hours * 3600000).toISOString(),
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
          Cancel
        </button>
      </div>
    </div>
  );
}
