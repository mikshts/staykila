// src/components/guest/GuestPortal.jsx
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { roomService } from "../../services/roomService";
import { messageService } from "../../services/messageService";
import { supabase } from "../../lib/supabase";
import { buildGuestUrl, parseRoomParam } from "../../lib/guestUrl";
import {
  GuestPortalSkeleton,
  RoomNotFoundSkeleton,
  GuestPortalLoading,
} from "../ui";
import QRCode from "qrcode";

export default function GuestPortal() {
  const [searchParams] = useSearchParams();
  const [room, setRoom] = useState(null);
  const [hotel, setHotel] = useState(null);
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const qrContainerRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const timerIntervalRef = useRef(null);

  const roomParam = searchParams.get("room");
  const roomName = searchParams.get("name") || "Room";

  // NOTE: parseRoomParam (src/lib/guestUrl.js) does NOT call
  // decodeURIComponent on its own initiative — `searchParams.get("room")`
  // from useSearchParams is ALREADY decoded. Manually decoding again here
  // was the source of the "works on desktop, fails on mobile" bug: some
  // mobile QR-scanner -> browser handoffs deliver a query string that's
  // been percent-decoded once already by the OS before the router sees
  // it, so decoding it a second time corrupted (or threw on) the value
  // ONLY on that path, not on a manually-typed desktop URL. See guestUrl.js
  // for the full explanation and the defensive fallback that replaces it.

  const loadRoomData = async () => {
    try {
      setLoading(true);

      const parsed = parseRoomParam(roomParam);
      console.log("Parsed room param:", parsed);
      console.log("Original roomParam:", roomParam);

      // Extract variables from parsed
      const hotelId = parsed?.hotelId;
      const roomId = parsed?.roomId;

      console.log("Extracted hotelId:", hotelId);
      console.log("Extracted roomId:", roomId);

      // If no hotelId, try to get it from room data
      if (!hotelId && roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          const newHotelId = roomData.hotel_id;
          setRoom(roomData);

          // Fetch hotel with the ID from room data
          if (newHotelId) {
            const { data: hotelData } = await supabase
              .from("hotels")
              .select("*")
              .eq("id", newHotelId)
              .single();
            if (hotelData) {
              setHotel(hotelData);
              setWifiPassword(hotelData.wifi_password || "");
            }
          }
        }
      } else if (roomId) {
        // Get room details with provided hotelId
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          setRoom(roomData);
        }

        // Get hotel info
        if (hotelId) {
          const { data: hotelData } = await supabase
            .from("hotels")
            .select("*")
            .eq("id", hotelId)
            .single();
          if (hotelData) {
            setHotel(hotelData);
            setWifiPassword(hotelData.wifi_password || "");
          }
        }
      }

      // If we still don't have room data, try once more with just the roomId
      if (!room && roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          setRoom(roomData);
          if (!hotelId && roomData.hotel_id) {
            const newHotelId = roomData.hotel_id;
            const { data: hotelData } = await supabase
              .from("hotels")
              .select("*")
              .eq("id", newHotelId)
              .single();
            if (hotelData) {
              setHotel(hotelData);
              setWifiPassword(hotelData.wifi_password || "");
            }
          }
        }
      }

      // Get menu images
      const currentHotelId = hotel?.id || hotelId;
      if (currentHotelId) {
        const { data: menuData } = await supabase
          .from("menu_images")
          .select("*")
          .eq("hotel_id", currentHotelId)
          .order("display_order");
        setMenuImages(menuData || []);
      }

      // Get active booking
      if (roomId) {
        const { data: bookings } = await supabase
          .from("bookings")
          .select("*")
          .eq("room_id", roomId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1);

        if (bookings && bookings.length > 0) {
          const booking = bookings[0];
          setRoom((prev) => ({ ...prev, booking }));
          setTimeRemaining(new Date(booking.end_time).getTime() - Date.now());
          setIsExpired(false);
        } else {
          setIsExpired(true);
        }

        // Get messages
        const msgs = await messageService.getMessages(roomId);
        const uniqueMsgs = [];
        const seenIds = new Set();
        msgs.forEach((msg) => {
          if (!seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            uniqueMsgs.push(msg);
          }
        });
        setMessages(uniqueMsgs);
        uniqueMsgs.forEach((msg) => messageIdsRef.current.add(msg.id));

        // Create or get guest session
        let token = localStorage.getItem(`guest_${roomId}_token`);
        if (!token) {
          const session = await messageService.createGuestSession(roomId);
          token = session.token;
          localStorage.setItem(`guest_${roomId}_token`, token);
        }
        setGuestToken(token);

        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
        }
        subscriptionRef.current = messageService.subscribeToRoom(
          roomId,
          (newMsg) => {
            if (!messageIdsRef.current.has(newMsg.id)) {
              messageIdsRef.current.add(newMsg.id);
              setMessages((prev) => [...prev, newMsg]);
              chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          },
        );
      }
    } catch (error) {
      console.error("Error loading room:", error);
      toast.error("Failed to load room data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomParam) {
      loadRoomData();
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [roomParam]);

  useEffect(() => {
    if (room && hotel && qrContainerRef.current) {
      // Clear previous QR
      qrContainerRef.current.innerHTML = "";

      // buildGuestUrl uses URLSearchParams under the hood so encoding is
      // always correct and consistent with how QRModal/QRDownload build it.
      const url = buildGuestUrl(hotel.id, room.id, room.name);
      console.log("Guest Portal QR URL:", url);

      // Generate QR using npm package
      QRCode.toCanvas(
        qrContainerRef.current,
        url,
        {
          width: 120,
          margin: 1,
          color: {
            dark: "#0f1b2d",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        },
        function (error) {
          if (error) {
            console.error("QR generation error:", error);
          }
        },
      );
    }
  }, [room, hotel]);

  // Timer effect with cleanup
  useEffect(() => {
    if (timeRemaining <= 0) return;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        if (newTime <= 0) {
          setIsExpired(true);
          clearInterval(timerIntervalRef.current);
          return 0;
        }
        return newTime;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
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
    if (!newMessage.trim()) {
      toast.error("Please type a message");
      return;
    }
    if (!guestToken) {
      toast.error("No active session");
      return;
    }

    try {
      const roomId = room?.id;
      const hotelId = hotel?.id;
      if (!roomId || !hotelId) {
        toast.error("Missing room or hotel information");
        return;
      }

      const msg = await messageService.sendGuestMessage(
        roomId,
        hotelId,
        newMessage,
        guestToken,
      );

      if (!messageIdsRef.current.has(msg.id)) {
        messageIdsRef.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      }
      setNewMessage("");
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  if (loading) {
    return <GuestPortalLoading />;
  }

  if (!room) {
    return <RoomNotFoundSkeleton />;
  }

  const progressPercentage = room.booking
    ? Math.max(
        0,
        Math.min(
          100,
          ((Date.now() - new Date(room.booking.start_time).getTime()) /
            (new Date(room.booking.end_time).getTime() -
              new Date(room.booking.start_time).getTime())) *
            100,
        ),
      )
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header - Minimal Apple Style */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/25 mb-4">
            <i className="fas fa-hotel text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            {hotel?.name || "StayDesk"}
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            Guest Portal
          </p>
        </div>

        {/* Room Card - Glassmorphism */}
        <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden">
          {/* Gradient Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />

          {/* Room Header */}
          <div className="px-6 pt-8 pb-6 text-center bg-gradient-to-br from-indigo-600/5 to-purple-600/5">
            <p className="text-indigo-400 text-[10px] font-semibold tracking-[0.2em] uppercase">
              Your Room
            </p>
            <h2 className="text-3xl font-bold text-slate-800 mt-1 tracking-tight">
              {room.name}
            </h2>
            <p className="text-slate-400 text-xs font-mono mt-1">
              {room.token}
            </p>
          </div>

          <div className="p-6">
            {/* Timer & Booking Info */}
            {!isExpired && room.booking ? (
              <>
                <div className="text-center mb-6">
                  <p className="text-slate-400 text-[10px] font-medium tracking-widest uppercase">
                    Time Remaining
                  </p>
                  <div
                    className={`timer-display text-5xl font-bold tracking-tight mt-1 ${
                      getStatusClass() === "warn"
                        ? "text-amber-500"
                        : getStatusClass() === "expired"
                          ? "text-red-500"
                          : "text-emerald-500"
                    }`}>
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        getStatusClass() === "warn"
                          ? "bg-amber-50 text-amber-600"
                          : getStatusClass() === "expired"
                            ? "bg-red-50 text-red-600"
                            : "bg-emerald-50 text-emerald-600"
                      }`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          getStatusClass() === "warn"
                            ? "bg-amber-400 animate-pulse"
                            : getStatusClass() === "expired"
                              ? "bg-red-400"
                              : "bg-emerald-400"
                        }`}
                      />
                      {getStatusText()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>Check-in</span>
                    <span>{Math.round(progressPercentage)}%</span>
                    <span>Check-out</span>
                  </div>
                </div>

                {/* Booking Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50/80 rounded-2xl p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Check-in
                    </p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {new Date(room.booking.start_time).toLocaleTimeString(
                        [],
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </p>
                  </div>
                  <div className="bg-slate-50/80 rounded-2xl p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Check-out
                    </p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {new Date(room.booking.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="bg-slate-50/80 rounded-2xl p-3 text-center backdrop-blur-sm">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Duration
                    </p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">
                      {room.booking.hours}h
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-3 text-center">
                    <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">
                      Price
                    </p>
                    <p className="text-sm font-bold text-indigo-600 mt-0.5">
                      ₱{room.booking.price}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-door-open text-2xl text-slate-300"></i>
                </div>
                <p className="text-slate-500 font-medium">No Active Stay</p>
                <p className="text-slate-400 text-sm mt-1">
                  Please check in at the front desk.
                </p>
              </div>
            )}

            {/* WiFi Button - Apple Style */}
            {wifiPassword && (
              <div className="mt-4">
                <button
                  onClick={() => setShowWifi(!showWifi)}
                  className={`w-full group relative overflow-hidden rounded-2xl py-3.5 px-4 font-medium transition-all duration-300 ${
                    showWifi
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10"
                  }`}>
                  <span className="relative flex items-center justify-center gap-2.5">
                    <i
                      className={`fas fa-wifi ${showWifi ? "text-white" : "text-blue-500"}`}></i>
                    {showWifi ? "Hide WiFi Password" : "Show WiFi Password"}
                    {!showWifi && (
                      <i className="fas fa-chevron-right text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform"></i>
                    )}
                  </span>
                </button>
                {showWifi && (
                  <div className="mt-3 p-4 bg-blue-50/80 backdrop-blur-sm rounded-2xl border border-blue-100/50 text-center animate-[fadeIn_0.3s_ease]">
                    <i className="fas fa-key text-blue-400 mr-2"></i>
                    <span className="font-mono font-semibold text-blue-700 text-lg tracking-wider select-all">
                      {wifiPassword}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(wifiPassword);
                        toast.success("Password copied!");
                      }}
                      className="ml-3 text-blue-400 hover:text-blue-600 transition-colors">
                      <i className="fas fa-copy text-sm"></i>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Menu Button - Apple Style */}
            {menuImages.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className={`w-full group relative overflow-hidden rounded-2xl py-3.5 px-4 font-medium transition-all duration-300 ${
                    showMenu
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10"
                  }`}>
                  <span className="relative flex items-center justify-center gap-2.5">
                    <i
                      className={`fas fa-utensils ${showMenu ? "text-white" : "text-purple-500"}`}></i>
                    {showMenu
                      ? "Hide Menu"
                      : `View Menu (${menuImages.length})`}
                  </span>
                </button>
                {showMenu && (
                  <div className="mt-3 grid grid-cols-2 gap-2 animate-[fadeIn_0.3s_ease]">
                    {menuImages.map((img, i) => (
                      <div
                        key={i}
                        className="group relative rounded-xl overflow-hidden bg-slate-100 aspect-square">
                        <img
                          src={img.image_url}
                          alt={`Menu ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes - Apple Style */}
            {room.notes && (
              <div className="mt-4 p-4 bg-amber-50/80 backdrop-blur-sm rounded-2xl border border-amber-100/50">
                <div className="flex items-start gap-2.5">
                  <i className="fas fa-note-sticky text-amber-400 mt-0.5"></i>
                  <div>
                    <p className="text-amber-700 text-sm font-medium">
                      Hotel Note
                    </p>
                    <p className="text-amber-600/80 text-sm mt-0.5">
                      {room.notes}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Chat - Apple Style with Expandable Design */}
            <div className="mt-4">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="w-full bg-slate-50/80 backdrop-blur-sm rounded-2xl py-3.5 px-4 border border-slate-100 hover:bg-slate-100/80 transition-all duration-300 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <i className="fas fa-comment-dots text-white text-sm"></i>
                  </div>
                  <div>
                    <p className="text-slate-700 font-medium text-sm">
                      Chat with Front Desk
                    </p>
                    <p className="text-slate-400 text-xs">
                      {messages.length} messages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {messages.filter((m) => m.sender === "admin" && !m.is_read)
                    .length > 0 && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                  <i
                    className={`fas fa-chevron-down text-slate-400 text-xs transition-transform duration-300 ${
                      isChatOpen ? "rotate-180" : ""
                    }`}></i>
                </div>
              </button>

              {isChatOpen && (
                <div className="mt-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100/50 overflow-hidden animate-[fadeIn_0.3s_ease]">
                  <div className="p-4 max-h-48 overflow-y-auto space-y-2">
                    {messages.length === 0 ? (
                      <div className="text-center py-6">
                        <i className="fas fa-comment-slash text-slate-300 text-2xl mb-2 block"></i>
                        <p className="text-slate-400 text-sm">
                          No messages yet
                        </p>
                        <p className="text-slate-300 text-xs">
                          Say hello to the front desk!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender === "admin" ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
                              msg.sender === "admin"
                                ? "bg-slate-100 text-slate-700 rounded-tl-none"
                                : "bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-tr-none shadow-md shadow-indigo-500/20"
                            }`}>
                            <p className="text-sm leading-relaxed">
                              {msg.message}
                            </p>
                            <p
                              className={`text-[10px] mt-1 ${
                                msg.sender === "admin"
                                  ? "text-slate-400"
                                  : "text-indigo-200"
                              }`}>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {msg.sender === "admin"
                                ? " · Front Desk"
                                : " · You"}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      />
                      <button
                        onClick={sendMessage}
                        className="px-4 py-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 flex items-center gap-2">
                        <i className="fas fa-paper-plane text-sm"></i>
                        <span className="hidden sm:inline text-sm font-medium">
                          Send
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* QR Code - Minimal Apple Style */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="text-center">
                <div className="inline-block p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <div
                    ref={qrContainerRef}
                    className="flex justify-center"></div>
                </div>
                <p className="text-slate-400 text-xs mt-2 flex items-center justify-center gap-1.5">
                  <i className="fas fa-qrcode text-indigo-400"></i>
                  Scan to refresh your stay information
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Minimal */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-[10px] font-medium tracking-wider">
            Powered by StayKila Lodge Management
          </p>
        </div>
      </div>

      {/* Add fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
