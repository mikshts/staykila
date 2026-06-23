// src/components/dashboard/RoomList.jsx
import React from "react";

function StatusPill({ status, getStatusMeta }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className={`status-pill ${meta.color} text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit`}>
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
      color: "text-blue-600",
    },
    double: {
      label: "Double Bed",
      icon: "🛏️🛏️",
      color: "text-purple-600",
    },
    family: {
      label: "Family Room",
      icon: "🏠",
      color: "text-amber-600",
    },
  };
  return types[roomType] || types.single;
};

export default function RoomList({
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
        <i className="fas fa-list text-3xl mb-2 block opacity-40"></i>
        <p className="text-sm">No rooms match this filter</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#fafafa] border-b border-[#e5e2db]">
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Room
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Status
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Type
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Messages
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Check-in
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Checkout
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Price
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Remaining
              </th>
              <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => {
              const status = room.booking
                ? getRoomStatus(room.booking.end_time)
                : room.status || "available";
              const unread = getUnreadForRoom(room.id);
              const countdown = room.booking
                ? formatCountdown(room.booking.end_time)
                : "—";
              const roomTypeInfo = getRoomTypeInfo(room.room_type);

              return (
                <tr
                  key={room.id}
                  className="border-b border-[#e5e2db] hover:bg-[#f7f3ee] transition">
                  <td className="p-2 font-medium">
                    {room.name || `Room ${room.room_number}`}
                  </td>
                  <td className="p-2">
                    <StatusPill status={status} getStatusMeta={getStatusMeta} />
                  </td>
                  <td className="p-2">
                    {room.booking ? (
                      <span
                        className={`text-xs font-medium ${roomTypeInfo.color}`}>
                        {roomTypeInfo.icon} {roomTypeInfo.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-2">
                    {unread > 0 ? (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {unread}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">
                    {room.booking ? formatTime(room.booking.start_time) : "—"}
                  </td>
                  <td className="p-2">
                    {room.booking ? formatTime(room.booking.end_time) : "—"}
                  </td>
                  <td className="p-2 font-medium text-[#c9a84c]">
                    {room.booking ? `₱${room.booking.price}` : "—"}
                  </td>
                  <td
                    className={`p-2 font-mono font-bold ${
                      status === "expiring"
                        ? "text-orange-500"
                        : status === "expired"
                          ? "text-red-500"
                          : "text-green-600"
                    }`}
                    data-timer={room.id}>
                    {countdown}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      {(status === "available" || status === "cleaning") && (
                        <button
                          onClick={() => onRoomAction("checkin", room)}
                          className="btn btn-navy text-[10px] font-semibold py-1 px-2 rounded bg-[#0f1b2d] text-white hover:opacity-90 transition">
                          <i className="fas fa-sign-in-alt"></i>
                        </button>
                      )}
                      {(status === "occupied" || status === "expiring") && (
                        <button
                          onClick={() => onRoomAction("extend", room)}
                          className="btn btn-gold text-[10px] font-semibold py-1 px-2 rounded bg-[#c9a84c] text-white hover:opacity-90 transition">
                          <i className="fas fa-plus"></i>
                        </button>
                      )}
                      {room.booking && (
                        <button
                          onClick={() => onRoomAction("checkout", room)}
                          className="btn btn-red text-[10px] font-semibold py-1 px-2 rounded bg-red-600 text-white hover:opacity-90 transition">
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      )}
                      {status === "cleaning" && (
                        <button
                          onClick={() => onMarkAvailable(room.id)}
                          className="btn btn-green text-[10px] font-semibold py-1 px-2 rounded bg-green-600 text-white hover:opacity-90 transition">
                          <i className="fas fa-sparkles"></i>
                        </button>
                      )}
                      <button
                        onClick={() => onRoomAction("detail", room)}
                        className="btn btn-ghost text-[10px] font-semibold py-1 px-2 rounded border border-[#e5e2db] hover:bg-[#f7f3ee] transition">
                        <i className="fas fa-ellipsis"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
