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
import ImageViewer from "./ImageViewer";
//constant
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const chatEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const qrContainerRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const timerIntervalRef = useRef(null);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const roomParam = searchParams.get("room");
  const roomName = searchParams.get("name") || "Room";

  // ------------------------------
  // 1. Offline/Online event listeners
  // ------------------------------
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-retry when back online
      loadRoomData();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setError("You are offline. Please check your internet connection.");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ------------------------------
  // 2. Load room data (with caching)
  // ------------------------------
  const loadRoomData = async () => {
    try {
      setLoading(true);
      setError(null);

      const parsed = parseRoomParam(roomParam);
      const hotelId = parsed?.hotelId;
      const roomId = parsed?.roomId;

      // --- Check cache first ---
      let cachedData = null;
      if (roomId) {
        const cached = localStorage.getItem(`guest_room_${roomId}`);
        if (cached) {
          try {
            cachedData = JSON.parse(cached);
            // Immediately apply cached data
            setRoom(cachedData.room);
            setHotel(cachedData.hotel);
            setWifiPassword(cachedData.wifiPassword || "");
            setMenuImages(cachedData.menuImages || []);
            if (cachedData.room?.booking) {
              setTimeRemaining(
                new Date(cachedData.room.booking.end_time).getTime() -
                  Date.now(),
              );
              setIsExpired(false);
            } else {
              setIsExpired(true);
            }
            setLoading(false); // show cached content immediately
          } catch (e) {
            console.warn("Invalid cache, ignoring");
          }
        }
      }

      // --- Fetch fresh data from server ---
      let freshRoom = null;
      let freshHotel = null;
      let freshWifi = "";
      let freshMenu = [];

      if (!hotelId && roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          freshRoom = roomData;
          const newHotelId = roomData.hotel_id;
          if (newHotelId) {
            const { data: hotelData } = await supabase
              .from("hotels")
              .select("*")
              .eq("id", newHotelId)
              .single();
            if (hotelData) {
              freshHotel = hotelData;
              freshWifi = hotelData.wifi_password || "";
            }
          }
        }
      } else if (roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          freshRoom = roomData;
        }
        if (hotelId) {
          const { data: hotelData } = await supabase
            .from("hotels")
            .select("*")
            .eq("id", hotelId)
            .single();
          if (hotelData) {
            freshHotel = hotelData;
            freshWifi = hotelData.wifi_password || "";
          }
        }
      }

      // If room still not found, try again
      if (!freshRoom && roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          freshRoom = roomData;
          if (!hotelId && roomData.hotel_id) {
            const newHotelId = roomData.hotel_id;
            const { data: hotelData } = await supabase
              .from("hotels")
              .select("*")
              .eq("id", newHotelId)
              .single();
            if (hotelData) {
              freshHotel = hotelData;
              freshWifi = hotelData.wifi_password || "";
            }
          }
        }
      }

      // Update state with fresh data
      if (freshRoom) setRoom(freshRoom);
      if (freshHotel) setHotel(freshHotel);
      if (freshWifi) setWifiPassword(freshWifi);

      // Fetch menu images
      const currentHotelId = freshHotel?.id || hotelId;
      if (currentHotelId) {
        const { data: menuData } = await supabase
          .from("menu_images")
          .select("*")
          .eq("hotel_id", currentHotelId)
          .order("display_order");
        if (menuData) {
          freshMenu = menuData;
          setMenuImages(menuData);
        }
      }

      // Fetch active booking
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

        // Messages
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

        // Guest session token
        let token = localStorage.getItem(`guest_${roomId}_token`);
        if (!token) {
          const session = await messageService.createGuestSession(roomId);
          token = session.token;
          localStorage.setItem(`guest_${roomId}_token`, token);
        }
        setGuestToken(token);

        // Real-time subscription
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

      // Save to cache after successful fetch
      if (roomId && (freshRoom || room) && (freshHotel || hotel)) {
        const cachePayload = {
          room: freshRoom || room,
          hotel: freshHotel || hotel,
          wifiPassword: freshWifi || wifiPassword,
          menuImages: freshMenu.length ? freshMenu : menuImages,
        };
        localStorage.setItem(
          `guest_room_${roomId}`,
          JSON.stringify(cachePayload),
        );
      }

      // If we had cached data, loading was set to false already, but we need to ensure it's false after fetch
      setLoading(false);
    } catch (err) {
      console.error("Error loading room:", err);
      setError(err.message || "Failed to load room data");
      if (!navigator.onLine) {
        setIsOffline(true);
      }
      toast.error("Failed to load room data");
      // If we have cached data, we keep showing it; otherwise show error UI
      // But loading is already false if we had cache; if no cache, we need to set loading false
      setLoading(false);
    }
  };

  // ------------------------------
  // 3. Other functions (existing)
  // ------------------------------
  const getRoomTypeInfo = (roomType) => {
    const types = {
      single: {
        label: "Single Bed Room",
        icon: "🛏️",
        description: "1 person · Standard room",
        color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      },
      double: {
        label: "Double Bed Room",
        icon: "🛏️🛏️",
        description: "2 persons · Queen/King bed",
        color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      },
      family: {
        label: "Family Room",
        icon: "🏠",
        description: "4-6 persons · Multiple beds",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      },
    };
    return types[roomType] || types.single;
  };

  const sendQuickMessage = async (messageText) => {
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
        messageText,
        guestToken,
      );
      if (!messageIdsRef.current.has(msg.id)) {
        messageIdsRef.current.add(msg.id);
        setMessages((prev) => [...prev, msg]);
      }
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      toast.success("Message sent!");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const quickActions = [
    {
      icon: "fa-towel",
      label: "Towels",
      message: "Can I get extra towels please?",
    },
    {
      icon: "fa-broom",
      label: "Housekeeping",
      message: "Can we get housekeeping service?",
    },
    {
      icon: "fa-utensils",
      label: "Room Service",
      message: "I'd like to order room service",
    },
    {
      icon: "fa-wifi",
      label: "WiFi Help",
      message: "Having trouble with the WiFi",
    },
    {
      icon: "fa-clock",
      label: "Late Checkout",
      message: "Can I request a late checkout?",
    },
    { icon: "fa-car", label: "Parking", message: "Where can I park my car?" },
    {
      icon: "fa-mug-saucer",
      label: "Coffee",
      message: "Can I get coffee in my room?",
    },
    {
      icon: "fa-plug",
      label: "Charger",
      message: "Do you have phone chargers available?",
    },
    {
      icon: "fa-snowflake",
      label: "AC Issue",
      message: "The AC isn't working properly",
    },
    { icon: "fa-tv", label: "TV Issue", message: "Having trouble with the TV" },
  ];

  // Initial load
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

  // QR code generation
  useEffect(() => {
    if (room && hotel && qrContainerRef.current) {
      qrContainerRef.current.innerHTML = "";
      const url = buildGuestUrl(hotel.id, room.id, room.name);
      QRCode.toCanvas(
        qrContainerRef.current,
        url,
        {
          width: 120,
          margin: 1,
          color: { dark: "#c9a84c", light: "#0f1b2d" },
          errorCorrectionLevel: "H",
        },
        function (error) {
          if (error) console.error("QR generation error:", error);
        },
      );
    }
  }, [room, hotel]);

  // Timer update
  useEffect(() => {
    if (timeRemaining <= 0) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }
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
        timerIntervalRef.current = null;
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // ------------------------------
  // 4. Offline/Error UI
  // ------------------------------
  if (isOffline || error) {
    return (
      <div className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <i
              className={`fas ${
                isOffline ? "fa-wifi-slash" : "fa-exclamation-triangle"
              } text-3xl text-amber-400`}></i>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isOffline ? "No Internet Connection" : "Something went wrong"}
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {isOffline
              ? "Please connect to the hotel Wi-Fi network and try again."
              : error || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={() => {
              setError(null);
              setIsOffline(!navigator.onLine);
              loadRoomData();
            }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] rounded-xl font-medium hover:shadow-lg hover:shadow-[#c9a84c]/25 transition-all duration-300">
            <i className="fas fa-sync-alt"></i>
            Retry
          </button>
          <div className="mt-4 text-xs text-gray-500">
            <i className="fas fa-info-circle mr-1"></i>
            Make sure you are connected to{" "}
            <span className="text-[#c9a84c]">
              {hotel?.name || "hotel"}
            </span>{" "}
            Wi-Fi.
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton (if no cached data and still loading)
  if (loading) {
    return <GuestPortalLoading />;
  }

  // Room not found
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

  // ------------------------------
  // 5. Main UI (unchanged except footer is already updated)
  // ------------------------------
  return (
    <div className="min-h-screen bg-[#0f1b2d]">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Subtle gradient glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(201,168,76,0.08),transparent_55%)] pointer-events-none" />

      <div className="relative max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <img
            src="/favicon1.png"
            alt="StayKila"
            className="w-16 h-16 rounded-2xl mx-auto mb-4 object-contain bg-white/5 border border-[#c9a84c]/30 shadow-lg shadow-black/30 p-2"
          />
          <h1
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-3xl font-medium text-white tracking-tight">
            {hotel?.name || "StayKila"}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-1">
            <span className="h-px w-8 bg-[#c9a84c]" />
            <p className="text-[#c9a84c] text-[10px] font-semibold tracking-[0.25em] uppercase">
              Guest Portal
            </p>
            <span className="h-px w-8 bg-[#c9a84c]" />
          </div>
        </div>

        <div className="relative bg-white/[0.04] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl shadow-black/40 overflow-hidden flex-1">
          {/* Gold Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

          {/* Room Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-white/5 bg-gradient-to-b from-[#c9a84c]/5 to-transparent">
            <p className="text-[#c9a84c] text-[10px] font-semibold tracking-[0.2em] uppercase">
              Your Room
            </p>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-4xl font-medium text-white mt-1">
              {room.name}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getRoomTypeInfo(room.room_type).color}`}>
                <span>{getRoomTypeInfo(room.room_type).icon}</span>
                {getRoomTypeInfo(room.room_type).label}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs font-mono text-gray-500">
                {room.token}
              </span>
              <span className="w-1 h-1 rounded-full bg-[#c9a84c]/30" />
              <span className="text-[10px] text-[#c9a84c] font-medium">
                {room.booking ? "Active Stay" : "Available"}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Status & Timer */}
            {!isExpired && room.booking ? (
              <>
                <div className="text-center">
                  <p className="text-gray-400 text-[10px] font-medium tracking-widest uppercase">
                    Time Remaining
                  </p>
                  <div
                    className={`text-5xl font-bold tracking-tight mt-1 font-mono ${
                      getStatusClass() === "warn"
                        ? "text-amber-400"
                        : getStatusClass() === "expired"
                          ? "text-red-400"
                          : "text-[#c9a84c]"
                    }`}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#c9a84c] to-[#e8d189] rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1.5">
                    <span>Check-in</span>
                    <span>{Math.round(progressPercentage)}%</span>
                    <span>Check-out</span>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      Check-in
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {new Date(room.booking.start_time).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      Check-out
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {new Date(room.booking.end_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      Duration
                    </p>
                    <p className="text-sm font-semibold text-white mt-0.5">
                      {room.booking.hours}h
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-[#c9a84c]/10 to-[#e8d189]/10 rounded-2xl p-3 text-center border border-[#c9a84c]/20">
                    <p className="text-[10px] text-[#c9a84c] font-medium uppercase tracking-wider">
                      Price
                    </p>
                    <p className="text-sm font-bold text-[#c9a84c] mt-0.5">
                      ₱{room.booking.price}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/10">
                  <i className="fas fa-door-open text-2xl text-gray-500"></i>
                </div>
                <p className="text-white font-medium">No Active Stay</p>
                <p className="text-gray-400 text-sm mt-1">
                  Please check in at the front desk.
                </p>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "info", icon: "fa-info-circle", label: "Info" },
                { id: "chat", icon: "fa-comment", label: "Chat" },
                { id: "menu", icon: "fa-utensils", label: "Menu" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-300 relative ${
                    activeTab === tab.id
                      ? "text-[#0f1b2d] bg-gradient-to-r from-[#c9a84c] to-[#e8d189] shadow-lg shadow-[#c9a84c]/25"
                      : "text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5"
                  }`}>
                  <i className={`fas ${tab.icon} mr-1.5`}></i>
                  {tab.label}
                  {tab.id === "chat" &&
                    messages.filter((m) => m.sender === "admin" && !m.is_read)
                      .length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  {tab.id === "menu" && menuImages.length > 0 && (
                    <span className="ml-1 text-[10px] opacity-60">
                      ({menuImages.length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[200px]">
              {/* Info Tab */}
              {activeTab === "info" && (
                <div className="space-y-4 animate-fadeIn">
                  <div
                    className={`bg-white/5 rounded-2xl p-4 border border-white/10`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${getRoomTypeInfo(room.room_type).color.replace("text-", "bg-").replace("border-", "border-")}`}>
                        <span className="text-xl">
                          {getRoomTypeInfo(room.room_type).icon}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {getRoomTypeInfo(room.room_type).label}
                        </p>
                        <p className="text-xs text-gray-400">
                          {getRoomTypeInfo(room.room_type).description}
                        </p>
                      </div>
                    </div>
                  </div>
                  {wifiPassword && (
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#c9a84c]/20 rounded-xl flex items-center justify-center">
                            <i className="fas fa-wifi text-[#c9a84c]"></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">
                              WiFi Network
                            </p>
                            <p className="text-xs text-gray-400">
                              {hotel?.name || "Hotel"} WiFi
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowWifi(!showWifi)}
                          className="text-[#c9a84c] text-sm font-medium hover:text-[#e8d189] transition-colors">
                          {showWifi ? "Hide" : "Show"}
                        </button>
                      </div>
                      {showWifi && (
                        <div className="mt-3 p-3 bg-black/30 rounded-xl border border-[#c9a84c]/20">
                          <div className="flex items-center justify-between">
                            <code className="font-mono font-semibold text-[#c9a84c] text-lg tracking-wider">
                              {wifiPassword}
                            </code>
                            <button
                              onClick={() => copyToClipboard(wifiPassword)}
                              className="text-gray-400 hover:text-[#c9a84c] transition-colors">
                              <i className="fas fa-copy"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {room.notes && (
                    <div className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/20">
                      <div className="flex items-start gap-3">
                        <i className="fas fa-sticky-note text-amber-400 mt-0.5"></i>
                        <div>
                          <p className="text-sm font-medium text-amber-400">
                            Hotel Note
                          </p>
                          <p className="text-amber-400/80 text-sm mt-0.5">
                            {room.notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                      <i className="fas fa-sync-alt text-[#c9a84c] group-hover:rotate-180 transition-transform duration-500"></i>
                      <span className="text-xs">Refresh stay information</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Tab */}
              {activeTab === "chat" && (
                <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="p-4 max-h-48 overflow-y-auto space-y-3 custom-scrollbar">
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#c9a84c]/10 to-[#e8d189]/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#c9a84c]/20">
                          <i className="fas fa-comment-dots text-[#c9a84c] text-xl"></i>
                        </div>
                        <p className="text-gray-400 font-medium">
                          No messages yet
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          Start a conversation with the front desk
                        </p>
                        <p className="text-[10px] text-gray-500 mt-3">
                          <i className="fas fa-arrow-left text-[#c9a84c] mr-1"></i>
                          Swipe to see more quick requests
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.sender === "admin"
                              ? "justify-start"
                              : "justify-end"
                          }`}>
                          <div
                            className={`max-w-[85%] px-4 py-2.5 rounded-2xl ${
                              msg.sender === "admin"
                                ? "bg-white/10 text-gray-200 rounded-tl-none border border-white/5"
                                : "bg-gradient-to-br from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] rounded-tr-none shadow-lg shadow-[#c9a84c]/20"
                            }`}>
                            <p className="text-sm leading-relaxed">
                              {msg.message}
                            </p>
                            <p
                              className={`text-[10px] mt-1 ${
                                msg.sender === "admin"
                                  ? "text-gray-500"
                                  : "text-[#0f1b2d]/60"
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

                  {showQuickActions ? (
                    <div className="p-3 border-t border-white/5 bg-black/10">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                          Quick Requests
                        </p>
                        <button
                          onClick={() => setShowQuickActions(false)}
                          className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="overflow-x-auto overflow-y-visible pb-2 -mx-1 px-1">
                        <div className="flex flex-col gap-2 min-w-max">
                          <div className="flex gap-2">
                            {quickActions.slice(0, 5).map((action, index) => (
                              <button
                                key={index}
                                onClick={() => sendQuickMessage(action.message)}
                                className="group relative overflow-hidden px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#c9a84c]/30 backdrop-blur-sm hover:shadow-lg hover:shadow-[#c9a84c]/10 whitespace-nowrap flex-shrink-0">
                                <span className="relative flex items-center gap-2 text-gray-300 group-hover:text-white">
                                  <i
                                    className={`fas ${action.icon} text-[#c9a84c] text-[10px]`}></i>
                                  {action.label}
                                </span>
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            {quickActions.slice(5, 10).map((action, index) => (
                              <button
                                key={index + 5}
                                onClick={() => sendQuickMessage(action.message)}
                                className="group relative overflow-hidden px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#c9a84c]/30 backdrop-blur-sm hover:shadow-lg hover:shadow-[#c9a84c]/10 whitespace-nowrap flex-shrink-0">
                                <span className="relative flex items-center gap-2 text-gray-300 group-hover:text-white">
                                  <i
                                    className={`fas ${action.icon} text-[#c9a84c] text-[10px]`}></i>
                                  {action.label}
                                </span>
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 border-t border-white/5 bg-black/10">
                      <button
                        onClick={() => setShowQuickActions(true)}
                        className="w-full py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2">
                        <i className="fas fa-plus-circle text-[#c9a84c]"></i>
                        Show Quick Requests
                      </button>
                    </div>
                  )}

                  <div className="p-3 border-t border-white/10 bg-black/20">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2.5 bg-black/30 rounded-xl border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20 transition-all"
                      />
                      <button
                        onClick={sendMessage}
                        className="px-4 py-2.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] rounded-xl hover:shadow-lg hover:shadow-[#c9a84c]/25 transition-all duration-300 flex items-center gap-2 font-medium">
                        <i className="fas fa-paper-plane text-sm"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Tab */}
              {activeTab === "menu" && (
                <div className="animate-fadeIn">
                  {menuImages.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {menuImages.map((img, i) => (
                          <div
                            key={i}
                            className="group relative rounded-2xl overflow-hidden bg-white/5 aspect-square cursor-pointer hover:shadow-xl hover:shadow-black/30 transition-all duration-300 border border-white/5"
                            onClick={() => setSelectedImage(img.image_url)}>
                            <img
                              src={img.image_url}
                              alt={`Menu ${i + 1}`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <div className="bg-black/60 rounded-full p-3 backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                <i className="fas fa-expand text-white text-lg"></i>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-[10px] font-medium text-white/80 text-center group-hover:text-white transition-colors duration-300">
                                <i className="fas fa-eye text-[#c9a84c] mr-1.5 text-[8px]"></i>
                                Tap to view full size
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-3">
                        <p className="text-[10px] text-gray-500">
                          <i className="fas fa-images text-[#c9a84c] mr-1"></i>
                          {menuImages.length} menu items available
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/5">
                      <i className="fas fa-utensils text-gray-600 text-3xl mb-3 block"></i>
                      <p className="text-gray-400 font-medium">
                        No menu available
                      </p>
                      <p className="text-gray-500 text-sm">
                        Please check with the front desk
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Premium Version (already updated) */}
        <div className="text-center mt-6 pb-4 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-white/10" />
            <span className="text-[#c9a84c]">✦</span>
            <span className="h-px w-8 bg-white/10" />
          </div>
          <p className="text-[9px] text-gray-600 tracking-wider">
            Powered by{" "}
            <a
              href="mailto:villacampamichael123@gmail.com?subject=Interested in StayKila Hotel Management&body=Hello! I'm a hotel owner and I'd like to learn more about StayKila. Please send me more information."
              className="text-[#c9a84c] hover:text-[#e8d189] transition-colors hover:underline">
              StayKila
            </a>{" "}
            Lodge Management
          </p>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewer
          images={menuImages.map((img) => img.image_url)}
          currentIndex={menuImages.findIndex(
            (img) => img.image_url === selectedImage,
          )}
          onClose={() => setSelectedImage(null)}
          onIndexChange={(newIndex) =>
            setSelectedImage(menuImages[newIndex].image_url)
          }
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(201, 168, 76, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(201, 168, 76, 0.6);
        }
      `}</style>
    </div>
  );
}
