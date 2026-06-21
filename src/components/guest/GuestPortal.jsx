// src/components/guest/GuestPortal.jsx
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { roomService } from "../../services/roomService";
import { messageService } from "../../services/messageService";
import { supabase } from "../../lib/supabase";

export default function GuestPortal() {
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState(null);
  const [hotel, setHotel] = useState(null); // Add hotel state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [guestToken, setGuestToken] = useState(null);
  const [wifiPassword, setWifiPassword] = useState("");
  const [menuImages, setMenuImages] = useState([]);
  const [showWifi, setShowWifi] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const qrContainerRef = useRef(null);

  const roomParam = searchParams.get("room");
  const roomName = searchParams.get("name") || "Room";

  useEffect(() => {
    if (roomParam) {
      loadRoomData();
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [roomParam]);

  const loadRoomData = async () => {
    try {
      setLoading(true);
      const [hotelId, roomId] = roomParam.split("_");

      // Get hotel info first
      const { data: hotelData, error: hotelError } = await supabase
        .from("hotels")
        .select("*")
        .eq("id", hotelId)
        .single();

      if (hotelError) throw hotelError;
      setHotel(hotelData);

      // Get room details
      const roomData = await roomService.getRoom(roomId);
      setRoom(roomData);

      // Get active booking
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("room_id", roomId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (bookings && bookings.length > 0) {
        const booking = bookings[0];
        setTimeRemaining(new Date(booking.end_time).getTime() - Date.now());
        setIsExpired(false);
      } else {
        setIsExpired(true);
      }

      // Get messages
      const msgs = await messageService.getMessages(roomId);
      setMessages(msgs);

      // Get WiFi password and menu images from hotel data
      if (hotelData) {
        setWifiPassword(hotelData.wifi_password || "");
        // Get menu images
        const { data: menuData } = await supabase
          .from("menu_images")
          .select("*")
          .eq("hotel_id", hotelId)
          .order("display_order");
        setMenuImages(menuData || []);
      }

      // Create or get guest session
      let token = localStorage.getItem(`guest_${roomId}_token`);
      if (!token) {
        const session = await messageService.createGuestSession(roomId);
        token = session.token;
        localStorage.setItem(`guest_${roomId}_token`, token);
      }
      setGuestToken(token);

      // Setup realtime subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      subscriptionRef.current = messageService.subscribeToRoom(
        roomId,
        (newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        },
      );
    } catch (error) {
      console.error("Error loading room:", error);
      toast.error("Failed to load room data");
    } finally {
      setLoading(false);
    }
  };

  // Generate QR code after room and hotel are loaded
  useEffect(() => {
    if (room && hotel && qrContainerRef.current && window.QRCode) {
      // Clear previous QR
      qrContainerRef.current.innerHTML = "";
      const url = `${window.location.origin}/guest?room=${hotel.id}_${room.id}&name=${encodeURIComponent(room.name)}`;
      new window.QRCode(qrContainerRef.current, {
        text: url,
        width: 120,
        height: 120,
      });
    }
  }, [room, hotel]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (ms) => {
    if (ms <= 0) return "00:00:00";
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return [hours, minutes, seconds]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };

  const getStatusClass = () => {
    if (isExpired) return "expired";
    if (timeRemaining < 10 * 60 * 1000) return "warn";
    return "ok";
  };

  const getStatusText = () => {
    if (isExpired) return "⏰ Stay has ended";
    if (timeRemaining < 10 * 60 * 1000) return "⚠️ Expiring soon!";
    return "✓ Active stay";
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!guestToken) {
      toast.error("No active session");
      return;
    }

    try {
      const [hotelId, roomId] = roomParam.split("_");
      const msg = await messageService.sendGuestMessage(
        roomId,
        hotelId,
        newMessage,
        guestToken,
      );
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <i className="fas fa-door-open text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500">Room not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-md mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl shadow-lg mb-3">
            <i className="fas fa-hotel text-white text-2xl"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-800">
            {hotel?.name || "StayDesk"}
          </h1>
          <p className="text-gray-500 text-sm">Guest Portal</p>
        </div>

        {/* Room Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-6 text-center">
            <div className="text-indigo-200 text-xs uppercase tracking-wide">
              Your Room
            </div>
            <div className="text-3xl font-bold text-white mt-1">
              {room.name}
            </div>
            <div className="text-indigo-200 text-xs mt-1">{room.token}</div>
          </div>

          <div className="p-4">
            {/* Timer & Booking Info */}
            {!isExpired && room.booking ? (
              <>
                <div className="text-center mb-4">
                  <div className="text-gray-500 text-xs mb-1">
                    Time Remaining
                  </div>
                  <div
                    className={`timer-display ${getStatusClass()} text-4xl font-bold`}>
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getStatusText()}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      <i className="far fa-clock mr-1"></i>Check-in
                    </span>
                    <span className="font-medium">
                      {new Date(room.booking.start_time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      <i className="far fa-hourglass-half mr-1"></i>Check-out
                    </span>
                    <span className="font-medium">
                      {new Date(room.booking.end_time).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      <i className="fas fa-chart-line mr-1"></i>Duration
                    </span>
                    <span className="font-medium">
                      {room.booking.hours} hours
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      <i className="fas fa-tag mr-1"></i>Price
                    </span>
                    <span className="font-medium text-indigo-600">
                      ₱{room.booking.price}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <i className="fas fa-door-open text-5xl text-gray-300 mb-3"></i>
                <p className="text-gray-500">No active stay found</p>
              </div>
            )}

            {/* WiFi Button */}
            {wifiPassword && (
              <div className="mt-4">
                <button
                  onClick={() => setShowWifi(!showWifi)}
                  className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2">
                  <i className="fas fa-wifi"></i>
                  {showWifi ? "Hide WiFi Password" : "Show WiFi Password"}
                </button>
                {showWifi && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <i className="fas fa-key text-blue-500 mr-2"></i>
                    <span className="font-mono font-bold text-blue-700">
                      {wifiPassword}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Menu Button */}
            {menuImages.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold hover:bg-purple-600 transition flex items-center justify-center gap-2">
                  <i className="fas fa-utensils"></i>
                  {showMenu ? "Hide Menu" : `View Menu (${menuImages.length})`}
                </button>
                {showMenu && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {menuImages.map((img, i) => (
                      <img
                        key={i}
                        src={img.image_url}
                        alt={`Menu ${i + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {room.notes && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 text-amber-700 font-medium mb-1">
                  <i className="fas fa-note-sticky"></i> Hotel Note
                </div>
                <p className="text-amber-800 text-sm">{room.notes}</p>
              </div>
            )}

            {/* Chat */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-comment-dots text-indigo-600"></i>
                <span className="font-semibold text-sm">
                  Chat with Front Desk
                </span>
              </div>

              <div className="bg-white rounded-lg p-2 max-h-32 overflow-y-auto border">
                {messages.length === 0 ? (
                  <p className="text-gray-400 text-center text-sm py-2">
                    No messages yet
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`text-sm py-1 px-2 rounded-lg mb-1 ${
                        msg.sender === "admin"
                          ? "bg-indigo-100 text-indigo-800 ml-auto max-w-[80%]"
                          : "bg-gray-100 text-gray-700 mr-auto max-w-[80%]"
                      }`}>
                      {msg.message}
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>

            <div className="mt-4 text-center">
              <div
                ref={qrContainerRef}
                className="flex justify-center my-2"></div>
              <p className="text-xs text-gray-400">
                <i className="fas fa-qrcode mr-1"></i> Scan to refresh
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-400">
            Powered by StayDesk Lodge Management
          </p>
        </div>
      </div>
    </div>
  );
}
