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
                Source
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
              const hasFutureBooking =
                room.booking && room.bookingStatus === "booked";
              const bookingDate = hasFutureBooking ? room.bookingDate : null;

              // Use the actual room status
              const displayStatus = room.status || "available";
              const status =
                room.booking && room.bookingStatus !== "booked"
                  ? getRoomStatus(room.booking.end_time)
                  : displayStatus;
              const unread = getUnreadForRoom(room.id);
              const countdown =
                room.booking && room.bookingStatus !== "booked"
                  ? formatCountdown(room.booking.end_time)
                  : "—";
              const roomTypeInfo = getRoomTypeInfo(room.room_type);

              const bookingDateText = bookingDate
                ? `booked ${bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : "";

              return (
                <tr
                  key={room.id}
                  className="border-b border-[#e5e2db] hover:bg-[#f7f3ee] transition">
                  <td className="p-2 font-medium">
                    {room.name || `Room ${room.room_number}`}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <StatusPill
                        status={displayStatus}
                        getStatusMeta={getStatusMeta}
                      />
                      {hasFutureBooking && bookingDateText && (
                        <span className="text-[10px] text-purple-600 font-medium">
                          . {bookingDateText}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2">
                    {room.booking && room.bookingStatus !== "booked" ? (
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
                    {room.booking && room.bookingStatus !== "booked"
                      ? formatTime(room.booking.start_time)
                      : "—"}
                  </td>
                  <td className="p-2">
                    {room.booking && room.bookingStatus !== "booked"
                      ? formatTime(room.booking.end_time)
                      : "—"}
                  </td>
                  <td className="p-2 font-medium text-[#c9a84c]">
                    {room.booking && room.bookingStatus !== "booked"
                      ? `₱${room.booking.price}`
                      : "—"}
                  </td>
                  <td className="p-2">
                    {room.booking ? (
                      <span className="text-xs font-medium">
                        {room.booking.booking_source === "agoda" && "🏨 Agoda"}
                        {room.booking.booking_source === "booking" &&
                          "🛏️ Booking.com"}
                        {room.booking.booking_source === "walk-in" &&
                          "🚶 Walk-in"}
                        {room.booking.booking_source === "maintenance" &&
                          "🔧 Maintenance"}
                        {room.booking.booking_source === "other" && "📋 Other"}
                        {!room.booking.booking_source && "🚶 Walk-in"}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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
                      {(displayStatus === "available" ||
                        displayStatus === "cleaning") && (
                        <button
                          onClick={() => onRoomAction("checkin", room)}
                          className="btn btn-navy text-[10px] font-semibold py-1 px-2 rounded bg-[#0f1b2d] text-white hover:opacity-90 transition">
                          <i className="fas fa-sign-in-alt"></i>
                        </button>
                      )}
                      {(displayStatus === "occupied" ||
                        displayStatus === "expiring") && (
                        <button
                          onClick={() => onRoomAction("extend", room)}
                          className="btn btn-gold text-[10px] font-semibold py-1 px-2 rounded bg-[#c9a84c] text-white hover:opacity-90 transition">
                          <i className="fas fa-plus"></i>
                        </button>
                      )}
                      {room.booking && room.bookingStatus !== "booked" && (
                        <button
                          onClick={() => onRoomAction("checkout", room)}
                          className="btn btn-red text-[10px] font-semibold py-1 px-2 rounded bg-red-600 text-white hover:opacity-90 transition">
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      )}
                      {displayStatus === "cleaning" && (
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
