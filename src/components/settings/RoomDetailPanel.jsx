import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import QRModal from "../modals/QRModal";

export default function RoomDetailPanel({
  room,
  messages,
  onClose,
  onSendMessage,
  onSaveNotes,
  onCheckin,
  onExtend,
  onCheckout,
  onMarkAvailable,
  onCopyQR,
  onRename,
  formatTime,
  formatCountdown,
  getRoomStatus,
  getStatusMeta,
  getUnreadForRoom,
  hotelId,
  isReadOnly = false,
}) {
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState(room.notes || "");
  const [showQR, setShowQR] = useState(false);
  const chatEndRef = useRef(null);
  const panelRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Check if the booking is active (current) or future
  const isActiveBooking = room.booking && room.bookingStatus === "occupied";
  const isFutureBooking = room.booking && room.bookingStatus === "booked";

  // Use the correct status for display
  const displayStatus = isFutureBooking
    ? "available"
    : room.status || "available";
  const status =
    room.booking && !isFutureBooking
      ? getRoomStatus(room.booking.end_time)
      : displayStatus;
  const meta = getStatusMeta(displayStatus);

  // Check if room has future bookings for display
  const hasFutureBookings =
    room.futureBookings && room.futureBookings.length > 0;
  const bookingDates = hasFutureBookings
    ? room.futureBookings.map((b) => new Date(b.start_time))
    : [];

  const sendReply = async () => {
    if (!reply.trim()) return;
    await onSendMessage(room.id, reply, "admin");
    setReply("");
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  const copyQRUrl = () => {
    const baseUrl = window.location.origin;
    const roomParam = encodeURIComponent(`${hotelId}_${room.id}`);
    const url = `${baseUrl}/guest?room=${roomParam}&name=${encodeURIComponent(room.name)}`;
    navigator.clipboard.writeText(url);
    toast.success("QR URL copied to clipboard");
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Auto-scroll to the newest message whenever messages change (incoming or sent)
  useEffect(() => {
    if (messages.length > 0) {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [messages.length]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div
          ref={panelRef}
          className="bg-white w-full max-w-md h-full overflow-y-auto">
          {/* Header - Sticky */}
          <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-lg">{room.name}</div>
                <div className="text-xs text-white/60">
                  {meta.label} • Room #
                  {room.room_number || room.id.substring(0, 8)}
                  {/* Show future booking indicator */}
                  {hasFutureBookings && bookingDates.length > 0 && (
                    <span className="text-purple-300 ml-1">
                      • booked{" "}
                      {bookingDates
                        .map((d) => `${d.getMonth() + 1}/${d.getDate()}`)
                        .join(" * ")}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Only show countdown for ACTIVE bookings, not future bookings */}
            {isActiveBooking && room.booking && (
              <div className="mt-3 bg-white/10 rounded-xl p-3">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold font-mono ${
                      status === "expiring"
                        ? "text-orange-300"
                        : status === "expired"
                          ? "text-red-300"
                          : "text-green-300"
                    }`}
                    data-timer={room.id}>
                    {formatCountdown(room.booking.end_time)}
                  </div>
                  <div className="text-xs text-white/50">time remaining</div>
                  <div className="text-sm text-[#c9a84c] mt-1">
                    ₱{room.booking.price}
                  </div>
                </div>
              </div>
            )}

            {/* Show future booking info */}
            {isFutureBooking && room.booking && (
              <div className="mt-3 bg-purple-900/30 rounded-xl p-3">
                <div className="text-center">
                  <div className="text-sm font-semibold text-purple-300">
                    <i className="fas fa-calendar-check mr-2"></i>
                    Booked for{" "}
                    {new Date(room.booking.start_time).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </div>
                  <div className="text-xs text-purple-400/70 mt-1">
                    {room.booking.booking_source === "agoda" && "🏨 Agoda"}
                    {room.booking.booking_source === "booking" &&
                      "🛏️ Booking.com"}
                    {room.booking.booking_source === "walk-in" && "🚶 Walk-in"}
                    {room.booking.booking_source === "maintenance" &&
                      "🔧 Maintenance"}
                  </div>
                  {room.booking.notes && (
                    <div className="text-[10px] text-purple-400/50 mt-1">
                      📝 {room.booking.notes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content - Normal scroll */}
          <div className="p-4 pb-6">
            {/* Booking Info - Only show for active bookings */}
            {isActiveBooking && room.booking && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
                  Current booking
                </div>
                <div className="bg-[#f7f3ee] rounded-xl p-3 mb-4">
                  <div className="flex justify-between text-xs py-1 border-b border-[#e5e2db]">
                    <span className="text-[#8a8278]">Check-in</span>
                    <span className="font-medium">
                      {formatTime(room.booking.start_time)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-[#e5e2db]">
                    <span className="text-[#8a8278]">Checkout</span>
                    <span className="font-medium">
                      {formatTime(room.booking.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-[#e5e2db]">
                    <span className="text-[#8a8278]">Duration</span>
                    <span className="font-medium">
                      {room.booking.hours}h booked
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="text-[#8a8278]">Price</span>
                    <span className="font-medium text-[#c9a84c]">
                      ₱{room.booking.price}
                    </span>
                  </div>
                  {room.booking.notes && (
                    <div className="flex justify-between text-xs py-1 border-t border-[#e5e2db] mt-1 pt-1">
                      <span className="text-[#8a8278]">Notes</span>
                      <span className="font-medium text-gray-700 max-w-[60%] text-right">
                        {room.booking.notes}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Future Bookings List - WITH NOTES */}
            {hasFutureBookings && bookingDates.length > 0 && (
              <>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-2">
                  <i className="fas fa-calendar-check mr-1"></i> Future Bookings
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                  {bookingDates.map((date, index) => (
                    <div
                      key={index}
                      className="text-xs py-2 border-b border-purple-100 last:border-0">
                      <div className="flex justify-between">
                        <span className="text-purple-700 font-medium">
                          {date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-purple-600">
                          {room.futureBookings[index]?.booking_source ===
                            "agoda" && "🏨 Agoda"}
                          {room.futureBookings[index]?.booking_source ===
                            "booking" && "🛏️ Booking.com"}
                          {room.futureBookings[index]?.booking_source ===
                            "walk-in" && "🚶 Walk-in"}
                          {room.futureBookings[index]?.booking_source ===
                            "maintenance" && "🔧 Maintenance"}
                        </span>
                      </div>
                      {/* SHOW NOTES FOR EACH BOOKING */}
                      {room.futureBookings[index]?.notes && (
                        <div className="text-[10px] text-purple-500 mt-0.5 flex items-start gap-1">
                          <span>📝</span>
                          <span className="text-purple-600/80">
                            {room.futureBookings[index].notes}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Messages */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Messages{" "}
              {getUnreadForRoom(room.id) > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full ml-1">
                  {getUnreadForRoom(room.id)} new
                </span>
              )}
            </div>

            <div
              ref={chatContainerRef}
              className="bg-[#f8fafc] rounded-xl p-3 max-h-48 overflow-y-auto mb-3">
              {messages.length === 0 ? (
                <p className="text-[#8a8278] text-center text-sm py-4">
                  No messages yet
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-2 p-2 rounded-xl max-w-[80%] ${
                      msg.sender === "admin"
                        ? "bg-indigo-100 text-indigo-800 ml-auto"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                    <div className="text-sm">{msg.message}</div>
                    <div className="text-[9px] text-[#8a8278] mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                      {msg.sender === "admin" ? " · Admin" : " · Guest"}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Reply Input */}
            {!isReadOnly && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendReply()}
                  placeholder="Reply to guest..."
                  className="flex-1 px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none"
                />
                <button
                  onClick={sendReply}
                  className="px-4 py-2 bg-[#0f1b2d] text-white rounded-lg hover:opacity-90 transition">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Actions
            </div>
            <div className="space-y-2 mb-4">
              {!isReadOnly &&
                (displayStatus === "available" ||
                  displayStatus === "cleaning") &&
                !isFutureBooking && (
                  <button
                    onClick={onCheckin}
                    className="w-full py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                    <i className="fas fa-sign-in-alt"></i> Check In Guest
                  </button>
                )}
              {!isReadOnly &&
                (displayStatus === "occupied" ||
                  displayStatus === "expiring") && (
                  <button
                    onClick={onExtend}
                    className="w-full py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                    <i className="fas fa-plus"></i> Extend Stay
                  </button>
                )}
              {!isReadOnly && isActiveBooking && room.booking && (
                <button
                  onClick={onCheckout}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sign-out-alt"></i> Check Out Now
                </button>
              )}
              {!isReadOnly && displayStatus === "cleaning" && (
                <button
                  onClick={onMarkAvailable}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sparkles"></i> Mark as Available
                </button>
              )}
              <button
                onClick={() => setShowQR(true)}
                className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition flex items-center justify-center gap-2">
                <i className="fas fa-qrcode"></i> View / Download QR
              </button>
              <button
                onClick={() => {
                  const url = onCopyQR(room);
                  navigator.clipboard.writeText(url);
                  toast.success("QR URL copied to clipboard");
                }}
                className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition flex items-center justify-center gap-2">
                <i className="fas fa-copy"></i> Copy QR URL
              </button>
              {!isReadOnly && (
                <button
                  onClick={onRename}
                  className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition flex items-center justify-center gap-2">
                  <i className="fas fa-pen"></i> Rename Room
                </button>
              )}
            </div>

            {/* Notes */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Notes
            </div>
            <div className="flex gap-2">
              <textarea
                rows="3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isReadOnly}
                placeholder="Guest notes, special requests…"
                className="flex-1 px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none resize-none"
              />
            </div>
            {!isReadOnly && (
              <button
                onClick={() => onSaveNotes(room.id, notes)}
                className="mt-2 py-1.5 px-4 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
                <i className="fas fa-save mr-1"></i>Save notes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && (
        <QRModal
          room={room}
          hotelId={hotelId}
          onClose={() => setShowQR(false)}
        />
      )}
    </>
  );
}
