// src/components/dashboard/RoomGrid.jsx
import React from "react";

function StatusPill({ status, getStatusMeta }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`status-pill ${meta.color} text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
      {meta.label}
    </span>
  );
}

// Helper function to get room type info
const getRoomTypeInfo = (roomType) => {
  const types = {
    single: {
      label: "Single Bed",
      icon: "🛏️",
      color: "text-blue-600 bg-blue-50",
    },
    double: {
      label: "Double Bed",
      icon: "🛏️🛏️",
      color: "text-purple-600 bg-purple-50",
    },
    family: {
      label: "Family Room",
      icon: "🏠",
      color: "text-amber-600 bg-amber-50",
    },
  };
  return types[roomType] || types.single;
};

export default function RoomGrid({
  rooms,
  onRoomAction,
  onMarkAvailable,
  formatTime,
  formatCountdown,
  getRoomStatus,
  getStatusMeta,
  getUnreadForRoom,
}) {
  if (!rooms.length) {
    return (
      <div className="text-center py-8 text-[#8a8278]">
        <i className="fas fa-door-open text-3xl mb-2 block opacity-40"></i>
        <p className="text-sm">No rooms match this filter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {rooms.map((room) => {
        const status = room.booking
          ? getRoomStatus(room.booking.end_time)
          : room.status || "available";
        const unread = getUnreadForRoom(room.id);
        const countdown = room.booking
          ? formatCountdown(room.booking.end_time)
          : null;
        const roomTypeInfo = getRoomTypeInfo(room.room_type);

        return (
          <div
            key={room.id}
            className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden hover:shadow-lg transition">
            {/* Header */}
            <div className="p-3 flex items-start justify-between border-b border-[#e5e2db]">
              <div>
                <div className="font-bold text-[#0f1b2d] text-base">
                  {room.name || `Room ${room.room_number}`}
                </div>
                {/* Room Type Badge - Only show if occupied */}
                {room.booking && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${roomTypeInfo.color}`}>
                      <span>{roomTypeInfo.icon}</span>
                      {roomTypeInfo.label}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => onRoomAction("detail", room)}
                  className="text-[10px] text-[#8a8278] hover:text-[#c9a84c] mt-0.5">
                  <i className="fas fa-pen text-[9px] mr-1"></i>Rename
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {unread > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    <i className="fas fa-envelope mr-0.5"></i>
                    {unread}
                  </span>
                )}
                <StatusPill status={status} getStatusMeta={getStatusMeta} />
              </div>
            </div>

            {/* Body */}
            <div className="p-3">
              {room.booking ? (
                <>
                  <div className="text-xs flex justify-between py-1 border-b border-[#e5e2db]">
                    <span className="text-[#8a8278]">
                      <i className="fas fa-right-to-bracket mr-1"></i>Check-in
                    </span>
                    <span className="font-medium">
                      {formatTime(room.booking.start_time)}
                    </span>
                  </div>
                  <div className="text-xs flex justify-between py-1 border-b border-[#e5e2db]">
                    <span className="text-[#8a8278]">
                      <i className="fas fa-right-from-bracket mr-1"></i>Checkout
                    </span>
                    <span className="font-medium">
                      {formatTime(room.booking.end_time)}
                    </span>
                  </div>
                  <div className="text-xs flex justify-between py-1 border-b border-[#e5e2db]">
                    <span className="text-[#8a8278]">
                      <i className="fas fa-tag mr-1"></i>Price
                    </span>
                    <span className="font-medium text-[#c9a84c]">
                      ₱{room.booking.price}
                    </span>
                  </div>
                  <div
                    className={`text-center font-bold font-mono text-xl mt-2 ${
                      status === "expiring"
                        ? "text-orange-500 animate-pulse"
                        : status === "expired"
                          ? "text-red-500"
                          : "text-green-600"
                    }`}
                    data-timer={room.id}>
                    {countdown}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-[#8a8278]">
                  <i
                    className={`fas ${status === "cleaning" ? "fa-broom" : "fa-door-open"} text-2xl mb-1 block opacity-40`}></i>
                  <p className="text-xs">
                    {status === "cleaning"
                      ? "Being cleaned"
                      : "Ready for check-in"}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-2 bg-[#fafafa] border-t border-[#e5e2db] flex flex-wrap gap-1">
              {(status === "available" || status === "cleaning") && (
                <button
                  onClick={() => onRoomAction("checkin", room)}
                  className="flex-1 btn btn-navy text-xs font-semibold py-1.5 px-2 rounded-lg bg-[#0f1b2d] text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                  <i className="fas fa-sign-in-alt"></i> Check In
                </button>
              )}
              {(status === "occupied" || status === "expiring") && (
                <button
                  onClick={() => onRoomAction("extend", room)}
                  className="flex-1 btn btn-gold text-xs font-semibold py-1.5 px-2 rounded-lg bg-[#c9a84c] text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                  <i className="fas fa-plus"></i> Extend
                </button>
              )}
              {room.booking && (
                <button
                  onClick={() => onRoomAction("checkout", room)}
                  className="btn btn-red text-xs font-semibold py-1.5 px-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                  <i className="fas fa-sign-out-alt"></i>
                </button>
              )}
              {status === "cleaning" && (
                <button
                  onClick={() => onMarkAvailable(room.id)}
                  className="flex-1 btn btn-green text-xs font-semibold py-1.5 px-2 rounded-lg bg-green-600 text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                  <i className="fas fa-sparkles"></i> Mark Ready
                </button>
              )}
              <button
                onClick={() => onRoomAction("detail", room)}
                className="btn btn-ghost text-xs font-semibold py-1.5 px-2 rounded-lg border border-[#e5e2db] hover:bg-[#f7f3ee] transition flex items-center justify-center gap-1">
                <i className="fas fa-ellipsis"></i>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
