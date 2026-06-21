// src/components/modals/CheckinModal.jsx
import React from "react";

export default function CheckinModal({
  room,
  prices,
  onCheckin,
  onClose,
  formatTime,
}) {
  const durations = [
    { hours: 1, label: "1 Hour", note: "Quick rest", icon: "🌙" },
    { hours: 3, label: "3 Hours", note: "Short stay", icon: "☕" },
    { hours: 6, label: "6 Hours", note: "Half day", icon: "🏠" },
    { hours: 12, label: "12 Hours", note: "Day use", icon: "🌅" },
    { hours: 24, label: "Overnight", note: "24 hours", icon: "🌛" },
  ];

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

        <div className="space-y-2">
          {durations.map((d) => (
            <button
              key={d.hours}
              onClick={() => onCheckin(room.id, d.hours)}
              className="w-full flex items-center gap-3 p-3 bg-[#f7f3ee] rounded-xl hover:border-[#c9a84c] border-2 border-transparent transition">
              <span className="text-xl">{d.icon}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{d.label}</div>
                <div className="text-xs text-[#8a8278]">{d.note}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[#c9a84c]">
                  ₱{prices[d.hours] || d.hours * 100}
                </div>
                <div className="text-[10px] text-[#8a8278]">
                  {formatTime(new Date().toISOString())} →{" "}
                  {formatTime(
                    new Date(Date.now() + d.hours * 3600000).toISOString(),
                  )}
                </div>
              </div>
            </button>
          ))}
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
