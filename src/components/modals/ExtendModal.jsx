// src/components/modals/ExtendModal.jsx
import React from "react";

export default function ExtendModal({
  room,
  prices,
  onExtend,
  onClose,
  formatTime,
  formatCountdown,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
            <i className="fas fa-hourglass-half"></i>
          </div>
          <div>
            <h3 className="font-bold text-[#0f1b2d]">Extend Stay</h3>
            <p className="text-xs text-[#8a8278]">{room?.name}</p>
          </div>
        </div>

        <div className="bg-[#f7f3ee] rounded-xl p-3 mb-4">
          <div className="flex justify-between text-xs py-1">
            <span className="text-[#8a8278]">Current checkout</span>
            <span className="font-medium">
              {room?.booking ? formatTime(room.booking.end_time) : "—"}
            </span>
          </div>
          <div className="flex justify-between text-xs py-1">
            <span className="text-[#8a8278]">Remaining</span>
            <span className="font-medium font-mono">
              {room?.booking ? formatCountdown(room.booking.end_time) : "—"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((h) => {
            const newEnd = room?.booking
              ? new Date(
                  new Date(room.booking.end_time).getTime() + h * 3600000,
                )
              : new Date();
            return (
              <button
                key={h}
                onClick={() => onExtend(room.id, h)}
                className="bg-green-50 border-2 border-transparent rounded-xl p-3 text-center hover:border-green-500 transition">
                <div className="text-xl font-bold text-green-700">+{h}h</div>
                <div className="text-sm font-bold text-[#c9a84c]">
                  ₱{prices[h] || h * 100}
                </div>
                <div className="text-[10px] text-[#8a8278]">
                  Until {formatTime(newEnd.toISOString())}
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
