// src/components/modals/CheckoutModal.jsx
import React from "react";

export default function CheckoutModal({ room, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-sign-out-alt text-red-600 text-2xl"></i>
          </div>
          <h3 className="font-bold text-[#0f1b2d] text-lg">Check Out Guest</h3>
          <p className="text-sm text-[#8a8278] mt-1">
            Are you sure you want to check out{" "}
            <span className="font-semibold text-[#0f1b2d]">{room?.name}</span>?
          </p>
        </div>

        {room?.booking && (
          <div className="bg-[#f7f3ee] rounded-xl p-3 mb-4">
            <div className="flex justify-between text-xs py-1 border-b border-[#e5e2db]">
              <span className="text-[#8a8278]">Check-in</span>
              <span className="font-medium">
                {new Date(room.booking.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-[#e5e2db]">
              <span className="text-[#8a8278]">Duration</span>
              <span className="font-medium">{room.booking.hours}h</span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-[#8a8278]">Price</span>
              <span className="font-medium text-[#c9a84c]">
                ₱{room.booking.price}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#e5e2db] rounded-lg text-sm font-medium text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
            <i className="fas fa-sign-out-alt mr-2"></i>
            Check Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
