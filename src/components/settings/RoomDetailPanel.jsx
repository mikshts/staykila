// src/components/settings/RoomDetailPanel.jsx
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
}) {
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState(room.notes || "");
  const [showQR, setShowQR] = useState(false);
  const chatEndRef = useRef(null);
  const panelRef = useRef(null);

  const status = room.booking
    ? getRoomStatus(room.booking.end_time)
    : room.status || "available";
  const meta = getStatusMeta(status);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    await onSendMessage(room.id, reply, "admin");
    setReply("");
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

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div
          ref={panelRef}
          className="bg-white w-full max-w-md h-full overflow-y-auto">
          <div className="sticky top-0 bg-[#0f1b2d] text-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-lg">{room.name}</div>
                <div className="text-xs text-white/60">
                  {meta.label} • Token: {room.token}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            {room.booking && (
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
          </div>

          <div className="p-4">
            {/* Booking Info */}
            {room.booking && (
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

            <div className="bg-[#f8fafc] rounded-xl p-3 max-h-48 overflow-y-auto mb-3">
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

            {/* Actions */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Actions
            </div>
            <div className="space-y-2 mb-4">
              {(status === "available" || status === "cleaning") && (
                <button
                  onClick={onCheckin}
                  className="w-full py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sign-in-alt"></i> Check In Guest
                </button>
              )}
              {(status === "occupied" || status === "expiring") && (
                <button
                  onClick={onExtend}
                  className="w-full py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-plus"></i> Extend Stay
                </button>
              )}
              {room.booking && (
                <button
                  onClick={onCheckout}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sign-out-alt"></i> Check Out Now
                </button>
              )}
              {status === "cleaning" && (
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
              <button
                onClick={onRename}
                className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition flex items-center justify-center gap-2">
                <i className="fas fa-pen"></i> Rename Room
              </button>
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
                placeholder="Guest notes, special requests…"
                className="flex-1 px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none resize-none"
              />
            </div>
            <button
              onClick={() => onSaveNotes(room.id, notes)}
              className="mt-2 py-1.5 px-4 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
              <i className="fas fa-save mr-1"></i>Save notes
            </button>
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
