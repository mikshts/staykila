// src/components/guest/GuestPortal.jsx
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { roomService } from "../../services/roomService";
import { messageService } from "../../services/messageService";
import { supabase } from "../../lib/supabase";
import {
  GuestPortalSkeleton,
  RoomNotFoundSkeleton,
  GuestPortalLoading,
} from "../ui";

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
  const chatEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const qrContainerRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const timerIntervalRef = useRef(null);

  const roomParam = searchParams.get("room");
  const roomName = searchParams.get("name") || "Room";

  // Parse room param helper
  const parseRoomParam = (param) => {
    if (!param) return null;

    // Try to parse as JSON first (for QR codes)
    try {
      const parsed = JSON.parse(decodeURIComponent(param));
      if (parsed.hotelId && parsed.roomId) {
        return { hotelId: parsed.hotelId, roomId: parsed.roomId };
      }
    } catch (e) {
      // Not JSON, continue
    }

    // Format: hotelId_roomId
    if (param.includes("_")) {
      const parts = param.split("_");
      // If we have more than 2 parts, the hotel ID might contain underscores
      if (parts.length === 2) {
        return { hotelId: parts[0], roomId: parts[1] };
      } else {
        // Join all but the last part for hotel ID
        const hotelId = parts.slice(0, parts.length - 1).join("_");
        const roomId = parts[parts.length - 1];
        return { hotelId, roomId };
      }
    }

    // Just room ID
    return { roomId: param };
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

  const loadRoomData = async () => {
    try {
      setLoading(true);

      const parsed = parseRoomParam(roomParam);
      console.log("Parsed room param:", parsed);

      let hotelId = parsed?.hotelId;
      let roomId = parsed?.roomId;

      // If no hotelId, try to get it from room data
      if (!hotelId && roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          hotelId = roomData.hotel_id;
          setRoom(roomData);
        }
      } else if (roomId) {
        // Get room details
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          setRoom(roomData);
        }
      }

      // Get hotel info
      if (hotelId) {
        const { data: hotelData, error: hotelError } = await supabase
          .from("hotels")
          .select("*")
          .eq("id", hotelId)
          .single();

        if (!hotelError && hotelData) {
          setHotel(hotelData);
          setWifiPassword(hotelData.wifi_password || "");
        }
      }

      // If we still don't have room data, try once more
      if (!room && roomId) {
        const roomData = await roomService.getRoom(roomId);
        if (roomData) {
          setRoom(roomData);
          if (!hotelId && roomData.hotel_id) {
            hotelId = roomData.hotel_id;
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
      }

      // Get menu images
      if (hotelId) {
        const { data: menuData } = await supabase
          .from("menu_images")
          .select("*")
          .eq("hotel_id", hotelId)
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
          // Update room with booking data
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

        // Setup realtime subscription
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

  // Generate QR code after room and hotel are loaded
  useEffect(() => {
    if (room && hotel && qrContainerRef.current && window.QRCode) {
      qrContainerRef.current.innerHTML = "";
      // Use the hotel ID from the hotel object
      const url = `${window.location.origin}/guest?room=${hotel.id}_${room.id}&name=${encodeURIComponent(room.name)}`;
      console.log("QR URL:", url);
      try {
        new window.QRCode(qrContainerRef.current, {
          text: url,
          width: 120,
          height: 120,
        });
      } catch (error) {
        console.error("QR generation error:", error);
      }
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
    if (isExpired) return "Stay has ended";
    if (timeRemaining < 10 * 60 * 1000) return "Expiring soon";
    return "Active stay";
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
      // Get room ID from room object
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

  const statusClass = getStatusClass();

  return (
    <div className="kc-page">
      <style>{`
        .kc-page {
          min-height: 100vh;
          background: #F7F5F1;
          background-image:
            radial-gradient(circle at 15% 10%, rgba(201,162,75,0.10) 0%, transparent 45%),
            radial-gradient(circle at 85% 90%, rgba(20,33,61,0.06) 0%, transparent 45%);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #1F2430;
          padding: 32px 16px 56px;
        }
        .kc-wrap { max-width: 420px; margin: 0 auto; }

        .kc-brand { text-align: center; margin-bottom: 28px; }
        .kc-brand-mark {
          width: 52px; height: 52px; margin: 0 auto 14px;
          background: #14213D;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 20px -8px rgba(20,33,61,0.5);
        }
        .kc-brand-mark i { color: #C9A24B; font-size: 22px; }
        .kc-brand-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 22px; font-weight: 600; letter-spacing: -0.01em;
          color: #14213D; margin: 0;
        }
        .kc-brand-sub {
          font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9A917F; margin-top: 2px;
        }

        /* The keycard */
        .kc-card {
          background: #14213D;
          border-radius: 22px;
          position: relative;
          box-shadow: 0 24px 48px -20px rgba(20,33,61,0.45);
          overflow: visible;
        }
        .kc-card-top {
          padding: 30px 26px 26px;
          position: relative;
          text-align: center;
        }
        .kc-card-top::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: radial-gradient(circle at 80% -10%, rgba(201,162,75,0.18), transparent 60%);
          border-radius: 22px 22px 0 0;
        }
        .kc-eyebrow {
          font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;
          color: #C9A24B; font-weight: 600; position: relative; z-index: 1;
        }
        .kc-room-name {
          font-family: 'Fraunces', Georgia, serif;
          font-size: 42px; font-weight: 600; line-height: 1;
          color: #F7F5F1; margin: 8px 0 6px; position: relative; z-index: 1;
        }
        .kc-room-token {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px; letter-spacing: 0.08em;
          color: rgba(247,245,241,0.55); position: relative; z-index: 1;
        }

        /* Notch / perforation, like a keycard or ticket stub */
        .kc-notch-row { display: flex; align-items: center; position: relative; }
        .kc-notch-circle {
          width: 26px; height: 26px; border-radius: 50%;
          background: #F7F5F1;
          margin-left: -13px; margin-right: -13px;
          flex-shrink: 0;
        }
        .kc-perforation {
          flex: 1; height: 0;
          border-top: 2px dashed rgba(247,245,241,0.18);
        }

        .kc-card-body { background: #FFFFFF; border-radius: 0 0 22px 22px; padding: 26px; }

        /* Timer */
        .kc-timer-block { text-align: center; margin-bottom: 22px; }
        .kc-timer-label {
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9A917F; margin-bottom: 10px;
        }
        .kc-timer-lcd {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: 38px; font-weight: 700; letter-spacing: 0.04em;
          padding: 14px 22px;
          border-radius: 14px;
          background: #14213D;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
        }
        .kc-timer-lcd.ok { color: #7FCB9A; text-shadow: 0 0 18px rgba(127,203,154,0.45); }
        .kc-timer-lcd.warn { color: #E0A23B; text-shadow: 0 0 18px rgba(224,162,59,0.5); }
        .kc-timer-lcd.expired { color: #E0694B; text-shadow: 0 0 18px rgba(224,105,75,0.45); }
        .kc-timer-status {
          margin-top: 10px; font-size: 12.5px; font-weight: 600;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .kc-timer-status .dot { width: 7px; height: 7px; border-radius: 50%; }
        .kc-timer-status.ok { color: #4C8A66; }
        .kc-timer-status.ok .dot { background: #4C8A66; }
        .kc-timer-status.warn { color: #B9852A; }
        .kc-timer-status.warn .dot { background: #B9852A; }
        .kc-timer-status.expired { color: #C0563B; }
        .kc-timer-status.expired .dot { background: #C0563B; }

        /* Booking details */
        .kc-divider { border-top: 1px solid #ECE8DF; margin: 18px 0 14px; }
        .kc-detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 0; font-size: 14px;
        }
        .kc-detail-label { color: #8C8472; display: flex; align-items: center; gap: 7px; }
        .kc-detail-label i { width: 14px; color: #C9A24B; font-size: 12px; }
        .kc-detail-value { font-weight: 600; color: #1F2430; }
        .kc-detail-value.price { color: #14213D; font-family: 'JetBrains Mono', monospace; }

        .kc-empty { text-align: center; padding: 30px 10px; }
        .kc-empty i { font-size: 40px; color: #DCD7CB; margin-bottom: 12px; display: block; }
        .kc-empty p:first-of-type { color: #5C5648; font-weight: 600; font-size: 15px; }
        .kc-empty p:last-of-type { color: #9A917F; font-size: 12.5px; margin-top: 4px; }

        /* Action buttons */
        .kc-action {
          width: 100%; padding: 13px 16px; border-radius: 13px;
          font-weight: 600; font-size: 14px; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          margin-top: 12px;
        }
        .kc-action:active { transform: scale(0.98); }
        .kc-action.wifi { background: #EFF4F2; color: #2F5F49; }
        .kc-action.wifi:hover { background: #E3ECE7; }
        .kc-action.menu { background: #F4EEE3; color: #8A5A1F; }
        .kc-action.menu:hover { background: #EFE5D2; }

        .kc-reveal {
          margin-top: 10px; padding: 14px; border-radius: 12px; text-align: center;
        }
        .kc-reveal.wifi-box { background: #EFF4F2; border: 1px dashed #BFD9CC; }
        .kc-reveal .wifi-pass {
          font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 17px;
          letter-spacing: 0.05em; color: #2F5F49;
        }
        .kc-menu-grid {
          margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
        }
        .kc-menu-grid img {
          width: 100%; height: 120px; object-fit: cover; border-radius: 10px;
          border: 1px solid #ECE8DF;
        }

        .kc-note {
          margin-top: 16px; padding: 13px 14px; border-radius: 12px;
          background: #FBF3E3; border: 1px solid #F0E0BC;
        }
        .kc-note-head {
          display: flex; align-items: center; gap: 7px;
          color: #8A5A1F; font-weight: 600; font-size: 13px; margin-bottom: 4px;
        }
        .kc-note p { color: #7A6A4A; font-size: 13.5px; margin: 0; line-height: 1.45; }

        /* Chat */
        .kc-chat { margin-top: 18px; padding: 16px; border-radius: 14px; background: #F7F5F1; border: 1px solid #ECE8DF; }
        .kc-chat-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .kc-chat-head i { color: #14213D; font-size: 14px; }
        .kc-chat-head span { font-weight: 600; font-size: 13.5px; color: #1F2430; }

        .kc-chat-log {
          background: #FFFFFF; border-radius: 10px; padding: 10px;
          max-height: 150px; overflow-y: auto; border: 1px solid #ECE8DF;
        }
        .kc-chat-empty { text-align: center; color: #BCB5A4; font-size: 13px; padding: 14px 0; }
        .kc-bubble {
          font-size: 13.5px; padding: 7px 11px; border-radius: 12px; margin-bottom: 6px;
          max-width: 82%; line-height: 1.4; word-break: break-word;
        }
        .kc-bubble.admin { background: #14213D; color: #F7F5F1; margin-left: auto; }
        .kc-bubble.guest { background: #EFEBE2; color: #2D2A22; margin-right: auto; }
        .kc-bubble-time { font-size: 10px; opacity: 0.6; margin-left: 8px; }

        .kc-chat-input-row { display: flex; gap: 8px; margin-top: 10px; }
        .kc-chat-input {
          flex: 1; padding: 10px 13px; border-radius: 10px; font-size: 13.5px;
          border: 1px solid #E0DACC; outline: none; background: #FFFFFF;
        }
        .kc-chat-input:focus { border-color: #C9A24B; box-shadow: 0 0 0 3px rgba(201,162,75,0.15); }
        .kc-send-btn {
          width: 40px; height: 40px; border-radius: 10px; background: #14213D; color: #C9A24B;
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .kc-send-btn:hover { background: #1C2D52; }
        .kc-send-btn:active { transform: scale(0.95); }

        /* QR */
        .kc-qr { margin-top: 18px; text-align: center; }
        .kc-qr-frame {
          display: inline-block; padding: 10px; background: #FFFFFF;
          border: 1px solid #ECE8DF; border-radius: 12px;
        }
        .kc-qr-caption { font-size: 11.5px; color: #B0A998; margin-top: 8px; }

        .kc-footer { text-align: center; margin-top: 22px; }
        .kc-footer p { font-size: 11px; color: #B0A998; letter-spacing: 0.03em; }

        @media (prefers-reduced-motion: no-preference) {
          .kc-card { animation: kc-rise 0.4s ease-out; }
          @keyframes kc-rise {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        }

        .kc-action:focus-visible,
        .kc-chat-input:focus-visible,
        .kc-send-btn:focus-visible {
          outline: 2px solid #C9A24B; outline-offset: 2px;
        }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
      />

      <div className="kc-wrap">
        {/* Brand header */}
        <div className="kc-brand">
          <div className="kc-brand-mark">
            <i className="fas fa-hotel"></i>
          </div>
          <h1 className="kc-brand-name">{hotel?.name || "StayDesk"}</h1>
          <div className="kc-brand-sub">Guest Portal</div>
        </div>

        {/* Keycard */}
        <div className="kc-card">
          <div className="kc-card-top">
            <div className="kc-eyebrow">Your Room</div>
            <div className="kc-room-name">{room.name}</div>
            <div className="kc-room-token">{room.token}</div>
          </div>

          {/* Perforated notch divider, like a keycard edge */}
          <div className="kc-notch-row">
            <div className="kc-notch-circle" />
            <div className="kc-perforation" />
            <div className="kc-notch-circle" />
          </div>

          <div className="kc-card-body">
            {/* Timer & Booking Info */}
            {!isExpired && room.booking ? (
              <>
                <div className="kc-timer-block">
                  <div className="kc-timer-label">Time Remaining</div>
                  <div className={`kc-timer-lcd ${statusClass}`}>
                    {formatTime(timeRemaining)}
                  </div>
                  <div className={`kc-timer-status ${statusClass}`}>
                    <span className="dot"></span>
                    {getStatusText()}
                  </div>
                </div>

                <div className="kc-divider"></div>

                <div className="kc-detail-row">
                  <span className="kc-detail-label">
                    <i className="far fa-clock"></i>Check-in
                  </span>
                  <span className="kc-detail-value">
                    {new Date(room.booking.start_time).toLocaleTimeString()}
                  </span>
                </div>
                <div className="kc-detail-row">
                  <span className="kc-detail-label">
                    <i className="far fa-hourglass-half"></i>Check-out
                  </span>
                  <span className="kc-detail-value">
                    {new Date(room.booking.end_time).toLocaleTimeString()}
                  </span>
                </div>
                <div className="kc-detail-row">
                  <span className="kc-detail-label">
                    <i className="fas fa-chart-line"></i>Duration
                  </span>
                  <span className="kc-detail-value">
                    {room.booking.hours} hours
                  </span>
                </div>
                <div className="kc-detail-row">
                  <span className="kc-detail-label">
                    <i className="fas fa-tag"></i>Price
                  </span>
                  <span className="kc-detail-value price">
                    ₱{room.booking.price}
                  </span>
                </div>
              </>
            ) : (
              <div className="kc-empty">
                <i className="fas fa-door-open"></i>
                <p>No active stay found</p>
                <p>Please check in at the front desk.</p>
              </div>
            )}

            {/* WiFi */}
            {wifiPassword && (
              <>
                <button
                  className="kc-action wifi"
                  onClick={() => setShowWifi(!showWifi)}>
                  <i className="fas fa-wifi"></i>
                  {showWifi ? "Hide WiFi Password" : "Show WiFi Password"}
                </button>
                {showWifi && (
                  <div className="kc-reveal wifi-box">
                    <i
                      className="fas fa-key"
                      style={{ color: "#2F5F49", marginRight: 8 }}></i>
                    <span className="wifi-pass">{wifiPassword}</span>
                  </div>
                )}
              </>
            )}

            {/* Menu */}
            {menuImages.length > 0 && (
              <>
                <button
                  className="kc-action menu"
                  onClick={() => setShowMenu(!showMenu)}>
                  <i className="fas fa-utensils"></i>
                  {showMenu ? "Hide Menu" : `View Menu (${menuImages.length})`}
                </button>
                {showMenu && (
                  <div className="kc-menu-grid">
                    {menuImages.map((img, i) => (
                      <img key={i} src={img.image_url} alt={`Menu ${i + 1}`} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            {room.notes && (
              <div className="kc-note">
                <div className="kc-note-head">
                  <i className="fas fa-note-sticky"></i> Hotel Note
                </div>
                <p>{room.notes}</p>
              </div>
            )}

            {/* Chat */}
            <div className="kc-chat">
              <div className="kc-chat-head">
                <i className="fas fa-comment-dots"></i>
                <span>Chat with Front Desk</span>
              </div>

              <div className="kc-chat-log">
                {messages.length === 0 ? (
                  <div className="kc-chat-empty">No messages yet</div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`kc-bubble ${msg.sender === "admin" ? "admin" : "guest"}`}>
                      {msg.message}
                      <span className="kc-bubble-time">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="kc-chat-input-row">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="kc-chat-input"
                />
                <button className="kc-send-btn" onClick={sendMessage}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
              <div
                id="guest-message-status"
                style={{ fontSize: 11, color: "#B0A998", marginTop: 6 }}></div>
            </div>

            {/* QR Code */}
            <div className="kc-qr">
              <div className="kc-qr-frame">
                <div ref={qrContainerRef}></div>
              </div>
              <p className="kc-qr-caption">
                <i className="fas fa-qrcode" style={{ marginRight: 5 }}></i>
                Scan to refresh
              </p>
            </div>
          </div>
        </div>

        <div className="kc-footer">
          <p>Powered by StayKila Lodge Management</p>
        </div>
      </div>
    </div>
  );
}
