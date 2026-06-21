// src/components/dashboard/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user, hotel, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showRoomDetail, setShowRoomDetail] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [messages, setMessages] = useState({});
  const [stats, setStats] = useState({
    available: 0,
    occupied: 0,
    expiring: 0,
    expired: 0,
    cleaning: 0,
  });
  const [revenue, setRevenue] = useState({
    total: 0,
    totalCheckins: 0,
    totalBookings: 0,
    occupancyRate: 0,
  });
  const [prices, setPrices] = useState({
    1: 100,
    3: 250,
    6: 450,
    12: 800,
    24: 1500,
  });
  const [wifiPassword, setWifiPassword] = useState("");
  const [menuImages, setMenuImages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminReply, setAdminReply] = useState("");
  const [roomNotes, setRoomNotes] = useState("");
  const [editPrices, setEditPrices] = useState({});
  const [uploading, setUploading] = useState(false);
  const [qrCodes, setQrCodes] = useState([]);

  const chatEndRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Fetch data on mount
  useEffect(() => {
    if (hotel?.id) {
      fetchRooms();
      fetchHotelSettings();
      fetchMessages();
      fetchActivityLogs();
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [hotel]);

  // Start timer for countdown updates
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    timerIntervalRef.current = setInterval(() => {
      updateTimers();
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [rooms]);

  // Fetch all hotel settings
  const fetchHotelSettings = async () => {
    try {
      // Fetch wifi password
      const { data: hotelData, error: hotelError } = await supabase
        .from("hotels")
        .select("wifi_password")
        .eq("id", hotel.id)
        .single();

      if (!hotelError && hotelData) {
        setWifiPassword(hotelData.wifi_password || "");
      }

      // Fetch menu images
      const { data: menuData, error: menuError } = await supabase
        .from("menu_images")
        .select("*")
        .eq("hotel_id", hotel.id)
        .order("display_order");

      if (!menuError && menuData) {
        setMenuImages(menuData);
      }

      // Fetch pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from("pricing")
        .select("*")
        .eq("hotel_id", hotel.id);

      if (!pricingError && pricingData) {
        const priceMap = {};
        pricingData.forEach((p) => {
          priceMap[p.duration_hours] = p.price;
        });
        setPrices(priceMap);
        setEditPrices(priceMap);
      }
    } catch (error) {
      console.error("Error fetching hotel settings:", error);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("hotel_id", hotel.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        const messageMap = {};
        data.forEach((msg) => {
          if (!messageMap[msg.room_id]) {
            messageMap[msg.room_id] = [];
          }
          messageMap[msg.room_id].push(msg);
        });
        setMessages(messageMap);

        const unread = data.filter(
          (msg) => !msg.is_read && msg.sender === "guest",
        ).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("hotel_id", hotel.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setActivityLog(data);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  // Fetch rooms
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rooms")
        .select(
          `
          *,
          bookings:bookings(
            id,
            start_time,
            end_time,
            hours,
            price,
            status,
            guest_name,
            guest_email,
            guest_phone
          )
        `,
        )
        .eq("hotel_id", hotel.id)
        .order("room_number");

      if (error) throw error;

      const processedRooms = (data || []).map((room) => {
        const activeBooking = room.bookings?.find((b) => b.status === "active");
        if (activeBooking) {
          room.booking = activeBooking;
          room.status = getRoomStatus(activeBooking.end_time);
        } else {
          room.booking = null;
        }
        return room;
      });

      setRooms(processedRooms);

      // Calculate stats
      const newStats = {
        available: 0,
        occupied: 0,
        expiring: 0,
        expired: 0,
        cleaning: 0,
      };
      let totalRevenue = 0;
      let totalCheckins = 0;

      processedRooms.forEach((room) => {
        const status = room.booking
          ? getRoomStatus(room.booking.end_time)
          : room.status || "available";
        if (newStats[status] !== undefined) {
          newStats[status]++;
        }
        if (room.booking) {
          totalRevenue += room.booking.price || 0;
          totalCheckins++;
        }
      });

      setStats(newStats);

      const totalRooms = processedRooms.length;
      const occupied = newStats.occupied + newStats.expiring + newStats.expired;
      const occupancyRate =
        totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

      setRevenue({
        total: totalRevenue,
        totalCheckins: totalCheckins,
        totalBookings: totalCheckins,
        occupancyRate: occupancyRate,
      });
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getRoomStatus = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    if (diff <= 0) return "expired";
    if (diff < 10 * 60 * 1000) return "expiring";
    return "occupied";
  };

  const formatTime = (dateString) => {
    if (!dateString) return "--:--";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCountdown = (endTime) => {
    if (!endTime) return "00:00:00";
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    if (diff <= 0) return "00:00:00";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return [hours, minutes, seconds]
      .map((v) => String(v).padStart(2, "0"))
      .join(":");
  };

  const updateTimers = () => {
    document.querySelectorAll("[data-timer]").forEach((el) => {
      const roomId = el.dataset.timer;
      const room = rooms.find((r) => r.id === parseInt(roomId));
      if (room?.booking) {
        const countdown = formatCountdown(room.booking.end_time);
        if (el.textContent !== countdown) {
          el.textContent = countdown;
        }
        const status = getRoomStatus(room.booking.end_time);
        el.className =
          `timer-display text-2xl font-bold font-mono ` +
          (status === "expiring"
            ? "text-orange-500 animate-pulse"
            : status === "expired"
              ? "text-red-500"
              : "text-green-600");
      }
    });
  };

  const getStatusMeta = (status) => {
    const meta = {
      available: {
        label: "Available",
        color: "bg-green-100 text-green-700",
        dot: "bg-green-500",
      },
      occupied: {
        label: "Occupied",
        color: "bg-red-100 text-red-700",
        dot: "bg-red-500",
      },
      expiring: {
        label: "Expiring",
        color: "bg-orange-100 text-orange-700",
        dot: "bg-orange-500",
      },
      expired: {
        label: "Expired",
        color: "bg-gray-100 text-gray-700",
        dot: "bg-gray-500",
      },
      cleaning: {
        label: "Cleaning",
        color: "bg-blue-100 text-blue-700",
        dot: "bg-blue-500",
      },
    };
    return meta[status] || meta.available;
  };

  const getUnreadForRoom = (roomId) => {
    return (
      messages[roomId]?.filter((m) => !m.is_read && m.sender === "guest")
        .length || 0
    );
  };

  const filteredRooms = () => {
    return rooms.filter((room) => {
      const status = room.booking
        ? getRoomStatus(room.booking.end_time)
        : room.status || "available";
      if (filter !== "all" && status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !room.name?.toLowerCase().includes(q) &&
          !String(room.room_number).includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  };

  // Room actions
  const handleCheckin = async (roomId, hours) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const price = prices[hours] || hours * 100;
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + hours * 3600000);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          room_id: roomId,
          hotel_id: hotel.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          hours: hours,
          price: price,
          status: "active",
          checked_in_at: startTime.toISOString(),
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", roomId);

      if (roomError) throw roomError;

      await logActivity(
        "checkin",
        `Checked into ${room.name} for ${hours}h (₱${price})`,
      );

      toast.success(`${room.name} checked in for ${hours} hours`);
      setShowCheckinModal(false);
      fetchRooms();
      fetchMessages();
    } catch (error) {
      console.error("Checkin error:", error);
      toast.error("Failed to check in");
    }
  };

  const handleExtend = async (roomId, hours) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room || !room.booking) return;

      const price = prices[hours] || hours * 100;
      const newEndTime = new Date(room.booking.end_time);
      newEndTime.setHours(newEndTime.getHours() + hours);

      const { error } = await supabase
        .from("bookings")
        .update({
          end_time: newEndTime.toISOString(),
          hours: room.booking.hours + hours,
          price: room.booking.price + price,
        })
        .eq("id", room.booking.id);

      if (error) throw error;

      await logActivity(
        "extend",
        `${room.name} extended by ${hours}h (₱${price})`,
      );

      toast.success(`${room.name} extended by ${hours} hours`);
      setShowExtendModal(false);
      fetchRooms();
    } catch (error) {
      console.error("Extend error:", error);
      toast.error("Failed to extend stay");
    }
  };

  const handleCheckout = async (roomId) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room || !room.booking) return;

      const { error: bookingError } = await supabase
        .from("bookings")
        .update({
          status: "completed",
          checked_out_at: new Date().toISOString(),
        })
        .eq("id", room.booking.id);

      if (bookingError) throw bookingError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "cleaning" })
        .eq("id", roomId);

      if (roomError) throw roomError;

      const { error: msgError } = await supabase
        .from("messages")
        .delete()
        .eq("room_id", roomId);

      if (msgError) console.error("Error clearing messages:", msgError);

      await logActivity(
        "checkout",
        `${room.name} checked out → cleaning (messages cleared)`,
      );

      toast.success(`${room.name} checked out successfully`);
      fetchRooms();
      fetchMessages();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to checkout");
    }
  };

  const handleMarkAvailable = async (roomId) => {
    try {
      const { error } = await supabase
        .from("rooms")
        .update({ status: "available" })
        .eq("id", roomId);

      if (error) throw error;

      await logActivity("clean", `Room marked as available`);
      toast.success("Room is now available");
      fetchRooms();
    } catch (error) {
      console.error("Error marking available:", error);
      toast.error("Failed to update room");
    }
  };

  const handleSendMessage = async (roomId, message, sender = "admin") => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          room_id: roomId,
          hotel_id: hotel.id,
          sender: sender,
          sender_id: sender === "admin" ? user.id : null,
          message: message,
          is_read: sender === "admin",
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => {
        const roomMessages = prev[roomId] || [];
        return { ...prev, [roomId]: [...roomMessages, data] };
      });

      if (sender === "admin") {
        setAdminReply("");
        toast.success("Message sent");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const logActivity = async (action, description) => {
    try {
      await supabase.from("activity_logs").insert({
        hotel_id: hotel.id,
        user_id: user.id,
        action_type: action,
        description: description,
      });
      fetchActivityLogs();
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const updateWifiPassword = async (password) => {
    try {
      const { error } = await supabase
        .from("hotels")
        .update({ wifi_password: password })
        .eq("id", hotel.id);

      if (error) throw error;

      setWifiPassword(password);
      toast.success("WiFi password updated");
      setShowWifiModal(false);
    } catch (error) {
      console.error("Error updating wifi:", error);
      toast.error("Failed to update WiFi password");
    }
  };

  const savePrices = async () => {
    try {
      const promises = Object.entries(editPrices).map(([hours, price]) =>
        supabase.from("pricing").upsert({
          hotel_id: hotel.id,
          duration_hours: parseInt(hours),
          price: price,
        }),
      );
      await Promise.all(promises);
      setPrices(editPrices);
      toast.success("Prices updated");
      setShowPriceModal(false);
      fetchRooms();
    } catch (error) {
      console.error("Error saving prices:", error);
      toast.error("Failed to save prices");
    }
  };

  const handleMenuUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${hotel.id}_${Date.now()}.${fileExt}`;
      const filePath = `menu/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      await supabase.from("menu_images").insert({
        hotel_id: hotel.id,
        image_url: urlData.publicUrl,
        display_order: menuImages.length,
      });

      toast.success("Menu image uploaded");
      fetchHotelSettings();
      setShowMenuModal(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleMenuRemove = async (imageId) => {
    try {
      await supabase.from("menu_images").delete().eq("id", imageId);
      toast.success("Image removed");
      fetchHotelSettings();
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Failed to remove image");
    }
  };

  const handleSaveNotes = async (roomId, notes) => {
    try {
      await supabase.from("rooms").update({ notes }).eq("id", roomId);
      toast.success("Notes saved");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    }
  };

  // QR Code generation (simplified)
  const generateQRUrl = (room) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/guest?room=${hotel.id}_${room.id}&name=${encodeURIComponent(room.name)}`;
  };

  // Render helper: status pill
  const StatusPill = ({ status }) => {
    const meta = getStatusMeta(status);
    return (
      <span
        className={`status-pill ${meta.color} text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
        {meta.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3ee] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a84c]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] flex">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[240px] bg-[#0f1b2d] z-50 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } overflow-y-auto`}>
        <div className="p-6 border-b border-white/10">
          <div className="text-white text-lg font-bold">
            Stay<span className="text-[#c9a84c]">Kila</span>
          </div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider">
            Lodge Management
          </div>
          <button
            className="lg:hidden absolute top-4 right-4 text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}>
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="m-4 p-3 bg-white/5 border border-white/10 rounded-xl">
          <div className="text-white text-sm font-semibold truncate">
            {hotel?.name || "Hotel"}
          </div>
          <div className="text-white/40 text-xs">{rooms.length} rooms</div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a84c] rounded-full transition-all duration-500"
              style={{ width: `${revenue.occupancyRate}%` }}
            />
          </div>
          <div className="text-white/30 text-[10px] mt-1">
            {revenue.occupancyRate}% occupancy
          </div>
        </div>

        <nav className="px-2 py-4">
          <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pb-2">
            Operations
          </div>
          <button
            onClick={() => {
              setFilter("all");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition ${
              filter === "all"
                ? "text-[#c9a84c] bg-[#c9a84c]/10 border-l-2 border-[#c9a84c]"
                : "text-white/55 hover:text-white hover:bg-white/5"
            }`}>
            <i className="fas fa-door-open w-5 text-center"></i>
            Rooms
            <span className="ml-auto text-white/30 text-xs">
              {rooms.length}
            </span>
          </button>
          {stats.expiring + stats.expired > 0 && (
            <button
              onClick={() => {
                setFilter("expiring");
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
              <i className="fas fa-triangle-exclamation w-5 text-center"></i>
              Alerts
              <span className="ml-auto bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                {stats.expiring + stats.expired}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              setShowMessagesPanel(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-envelope w-5 text-center"></i>
            Messages
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setShowActivityPanel(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-list-ul w-5 text-center"></i>
            Activity
          </button>

          <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
            Property
          </div>
          <button
            onClick={() => {
              setShowSettingsPanel(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-gear w-5 text-center"></i>
            Settings
          </button>
          <button
            onClick={() => {
              setShowPriceModal(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-tag w-5 text-center"></i>
            Edit Prices
          </button>
          <button
            onClick={() => {
              setShowWifiModal(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-wifi w-5 text-center"></i>
            WiFi Settings
          </button>
          <button
            onClick={() => {
              setShowMenuModal(true);
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-utensils w-5 text-center"></i>
            Room Service Menu
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="text-white/40 text-xs mb-2 truncate">
            <i className="fas fa-user mr-1"></i>
            {user?.email}
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-sm py-2 px-4 border border-white/10 rounded-lg transition">
            <i className="fas fa-sign-out-alt"></i>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#e5e2db] sticky top-0 z-30 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden text-[#0f1b2d]"
              onClick={() => setSidebarOpen(true)}>
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div>
              <h1 className="text-base font-bold text-[#0f1b2d] truncate">
                Rooms
              </h1>
              <p className="text-[10px] text-[#8a8278] truncate">
                {new Date().toLocaleDateString("en-PH", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
              <button
                onClick={() => setView("grid")}
                className={`px-2 py-1 rounded text-xs border transition ${
                  view === "grid"
                    ? "bg-[#0f1b2d] text-white border-[#0f1b2d]"
                    : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-[#0f1b2d]"
                }`}>
                <i className="fas fa-grid-2"></i>
                <span className="hidden sm:inline ml-1">Grid</span>
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-2 py-1 rounded text-xs border transition ${
                  view === "list"
                    ? "bg-[#0f1b2d] text-white border-[#0f1b2d]"
                    : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-[#0f1b2d]"
                }`}>
                <i className="fas fa-list"></i>
                <span className="hidden sm:inline ml-1">List</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4">
          {/* Revenue Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4">
            <div className="bg-white border border-[#e5e2db] rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-sm mx-auto mb-1.5">
                <i className="fas fa-coins"></i>
              </div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                ₱{revenue.total}
              </div>
              <div className="text-[10px] text-[#8a8278]">Total Revenue</div>
            </div>
            <div className="bg-white border border-[#e5e2db] rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-700 text-sm mx-auto mb-1.5">
                <i className="fas fa-users"></i>
              </div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {revenue.totalCheckins}
              </div>
              <div className="text-[10px] text-[#8a8278]">Total Check-ins</div>
            </div>
            <div className="bg-white border border-[#e5e2db] rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 text-sm mx-auto mb-1.5">
                <i className="fas fa-clock"></i>
              </div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {revenue.totalBookings}
              </div>
              <div className="text-[10px] text-[#8a8278]">Total Bookings</div>
            </div>
            <div className="bg-white border border-[#e5e2db] rounded-xl p-3 text-center">
              <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-700 text-sm mx-auto mb-1.5">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {revenue.occupancyRate}%
              </div>
              <div className="text-[10px] text-[#8a8278]">Occupancy Rate</div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            {[
              {
                key: "available",
                label: "Available",
                icon: "fa-check",
                color: "text-green-600 bg-green-100",
              },
              {
                key: "occupied",
                label: "Occupied",
                icon: "fa-bed",
                color: "text-red-600 bg-red-100",
              },
              {
                key: "expiring",
                label: "Expiring",
                icon: "fa-hourglass-half",
                color: "text-orange-600 bg-orange-100",
              },
              {
                key: "expired",
                label: "Expired",
                icon: "fa-clock",
                color: "text-gray-600 bg-gray-100",
              },
              {
                key: "cleaning",
                label: "Cleaning",
                icon: "fa-broom",
                color: "text-blue-600 bg-blue-100",
              },
              {
                key: "occupancy",
                label: "Occupancy",
                icon: "fa-building",
                color: "text-indigo-600 bg-indigo-100",
              },
            ].map((stat) => (
              <button
                key={stat.key}
                onClick={() => stat.key !== "occupancy" && setFilter(stat.key)}
                className="bg-white border border-[#e5e2db] rounded-xl p-2.5 text-center hover:shadow-md transition cursor-pointer">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs mx-auto mb-1 ${stat.color}`}>
                  <i className={`fas ${stat.icon}`}></i>
                </div>
                <div className="text-base font-bold text-[#0f1b2d]">
                  {stat.key === "occupancy"
                    ? `${revenue.occupancyRate}%`
                    : stats[stat.key] || 0}
                </div>
                <div className="text-[9px] text-[#8a8278]">{stat.label}</div>
              </button>
            ))}
          </div>

          {/* Filters + Search */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {[
              "all",
              "available",
              "occupied",
              "expiring",
              "expired",
              "cleaning",
            ].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap ${
                  filter === f
                    ? "bg-[#0f1b2d] text-white border-[#0f1b2d]"
                    : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-[#0f1b2d] hover:text-[#0f1b2d]"
                }`}>
                {f === "all" ? (
                  <>
                    <i className="fas fa-th-list mr-1"></i>All
                  </>
                ) : (
                  f.charAt(0).toUpperCase() + f.slice(1)
                )}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 bg-white border border-[#e5e2db] rounded-full px-3 py-1">
              <i className="fas fa-search text-[#8a8278] text-xs"></i>
              <input
                type="text"
                placeholder="Search rooms…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-none outline-none text-xs bg-transparent w-24 sm:w-32"
              />
            </div>
          </div>

          {/* Room Grid / List */}
          {view === "grid" ? renderGridView() : renderListView()}
        </div>
      </main>

      {/* Modals */}
      {showCheckinModal && selectedRoom && renderCheckinModal()}
      {showExtendModal && selectedRoom && renderExtendModal()}
      {showPriceModal && renderPriceModal()}
      {showWifiModal && renderWifiModal()}
      {showMenuModal && renderMenuModal()}
      {showActivityPanel && renderActivityPanel()}
      {showMessagesPanel && renderMessagesPanel()}
      {showSettingsPanel && renderSettingsPanel()}
      {showRoomDetail && selectedRoom && renderRoomDetail()}
    </div>
  );

  // ============================================================
  // RENDER FUNCTIONS
  // ============================================================

  function renderGridView() {
    const rooms = filteredRooms();
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
          const meta = getStatusMeta(status);
          const unread = getUnreadForRoom(room.id);
          const countdown = room.booking
            ? formatCountdown(room.booking.end_time)
            : null;

          return (
            <div
              key={room.id}
              className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden hover:shadow-lg transition">
              <div className="p-3 flex items-start justify-between border-b border-[#e5e2db]">
                <div>
                  <div className="font-bold text-[#0f1b2d] text-base">
                    {room.name || `Room ${room.room_number}`}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowRoomDetail(true);
                    }}
                    className="text-[10px] text-[#8a8278] hover:text-[#c9a84c]">
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
                  <StatusPill status={status} />
                </div>
              </div>

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
                        <i className="fas fa-right-from-bracket mr-1"></i>
                        Checkout
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

              <div className="p-2 bg-[#fafafa] border-t border-[#e5e2db] flex flex-wrap gap-1">
                {(status === "available" || status === "cleaning") && (
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowCheckinModal(true);
                    }}
                    className="flex-1 btn btn-navy text-xs font-semibold py-1.5 px-2 rounded-lg bg-[#0f1b2d] text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                    <i className="fas fa-sign-in-alt"></i> Check In
                  </button>
                )}
                {(status === "occupied" || status === "expiring") && (
                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowExtendModal(true);
                    }}
                    className="flex-1 btn btn-gold text-xs font-semibold py-1.5 px-2 rounded-lg bg-[#c9a84c] text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                    <i className="fas fa-plus"></i> Extend
                  </button>
                )}
                {room.booking && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Check out ${room.name}?`)) {
                        handleCheckout(room.id);
                      }
                    }}
                    className="btn btn-red text-xs font-semibold py-1.5 px-2 rounded-lg bg-red-600 text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                )}
                {status === "cleaning" && (
                  <button
                    onClick={() => handleMarkAvailable(room.id)}
                    className="flex-1 btn btn-green text-xs font-semibold py-1.5 px-2 rounded-lg bg-green-600 text-white hover:opacity-90 transition flex items-center justify-center gap-1">
                    <i className="fas fa-sparkles"></i> Mark Ready
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedRoom(room);
                    setShowRoomDetail(true);
                  }}
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

  function renderListView() {
    const rooms = filteredRooms();
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
                const meta = getStatusMeta(status);
                const unread = getUnreadForRoom(room.id);
                const countdown = room.booking
                  ? formatCountdown(room.booking.end_time)
                  : "—";

                return (
                  <tr
                    key={room.id}
                    className="border-b border-[#e5e2db] hover:bg-[#f7f3ee] transition">
                    <td className="p-2 font-medium">
                      {room.name || `Room ${room.room_number}`}
                    </td>
                    <td className="p-2">
                      <StatusPill status={status} />
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
                            onClick={() => {
                              setSelectedRoom(room);
                              setShowCheckinModal(true);
                            }}
                            className="btn btn-navy text-[10px] font-semibold py-1 px-2 rounded bg-[#0f1b2d] text-white hover:opacity-90 transition">
                            <i className="fas fa-sign-in-alt"></i>
                          </button>
                        )}
                        {(status === "occupied" || status === "expiring") && (
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setShowExtendModal(true);
                            }}
                            className="btn btn-gold text-[10px] font-semibold py-1 px-2 rounded bg-[#c9a84c] text-white hover:opacity-90 transition">
                            <i className="fas fa-plus"></i>
                          </button>
                        )}
                        {room.booking && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Check out ${room.name}?`)) {
                                handleCheckout(room.id);
                              }
                            }}
                            className="btn btn-red text-[10px] font-semibold py-1 px-2 rounded bg-red-600 text-white hover:opacity-90 transition">
                            <i className="fas fa-sign-out-alt"></i>
                          </button>
                        )}
                        {status === "cleaning" && (
                          <button
                            onClick={() => handleMarkAvailable(room.id)}
                            className="btn btn-green text-[10px] font-semibold py-1 px-2 rounded bg-green-600 text-white hover:opacity-90 transition">
                            <i className="fas fa-sparkles"></i>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowRoomDetail(true);
                          }}
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

  // ============================================================
  // MODAL RENDER FUNCTIONS
  // ============================================================

  function renderCheckinModal() {
    const durations = [
      { hours: 1, label: "1 Hour", note: "Quick rest", icon: "🌙" },
      { hours: 3, label: "3 Hours", note: "Short stay", icon: "☕" },
      { hours: 6, label: "6 Hours", note: "Half day", icon: "🏠" },
      { hours: 12, label: "12 Hours", note: "Day use", icon: "🌅" },
      { hours: 24, label: "Overnight", note: "24 hours", icon: "🌛" },
    ];

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#0f1b2d] rounded-xl flex items-center justify-center text-[#c9a84c]">
              <i className="fas fa-key"></i>
            </div>
            <div>
              <h3 className="font-bold text-[#0f1b2d]">Check In</h3>
              <p className="text-xs text-[#8a8278]">{selectedRoom?.name}</p>
            </div>
          </div>

          <div className="space-y-2">
            {durations.map((d) => (
              <button
                key={d.hours}
                onClick={() => handleCheckin(selectedRoom.id, d.hours)}
                className="w-full flex items-center gap-3 p-3 bg-[#f7f3ee] rounded-xl hover:border-[#c9a84c] border-2 border-transparent transition">
                <span className="text-xl">{d.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{d.label}</div>
                  <div className="text-xs text-[#8a8278]">{d.note}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#c9a84c]">
                    ₱{prices[d.hours] || d.hours * 100}
                  </div>
                  <div className="text-[10px] text-[#8a8278]">
                    {formatTime(new Date().toISOString())} →{" "}
                    {formatTime(
                      new Date(Date.now() + d.hours * 3600000).toISOString(),
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCheckinModal(false)}
            className="w-full mt-3 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function renderExtendModal() {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <i className="fas fa-hourglass-half"></i>
            </div>
            <div>
              <h3 className="font-bold text-[#0f1b2d]">Extend Stay</h3>
              <p className="text-xs text-[#8a8278]">{selectedRoom?.name}</p>
            </div>
          </div>

          <div className="bg-[#f7f3ee] rounded-xl p-3 mb-4">
            <div className="flex justify-between text-xs py-1">
              <span className="text-[#8a8278]">Current checkout</span>
              <span className="font-medium">
                {selectedRoom?.booking
                  ? formatTime(selectedRoom.booking.end_time)
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs py-1">
              <span className="text-[#8a8278]">Remaining</span>
              <span className="font-medium font-mono">
                {selectedRoom?.booking
                  ? formatCountdown(selectedRoom.booking.end_time)
                  : "—"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((h) => {
              const newEnd = selectedRoom?.booking
                ? new Date(
                    new Date(selectedRoom.booking.end_time).getTime() +
                      h * 3600000,
                  )
                : new Date();
              return (
                <button
                  key={h}
                  onClick={() => handleExtend(selectedRoom.id, h)}
                  className="bg-green-50 border-2 border-transparent rounded-xl p-3 text-center hover:border-green-500 transition">
                  <div className="text-xl font-bold text-green-700">+{h}h</div>
                  <div className="text-sm font-bold text-[#c9a84c]">
                    ₱{prices[h] || h * 100}
                  </div>
                  <div className="text-[10px] text-[#8a8278]">
                    Until {formatTime(newEnd.toISOString())}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowExtendModal(false)}
            className="w-full mt-3 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function renderPriceModal() {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
            Edit Room Prices
          </h3>
          <p className="text-xs text-[#8a8278] mb-4">
            Set your custom prices for each duration
          </p>

          <div className="space-y-2">
            {[
              { hours: 1, label: "Quick rest" },
              { hours: 3, label: "Short stay" },
              { hours: 6, label: "Half day" },
              { hours: 12, label: "Day use" },
              { hours: 24, label: "Overnight" },
            ].map((d) => (
              <div
                key={d.hours}
                className="flex items-center justify-between p-2 bg-[#f7f3ee] rounded-xl">
                <div>
                  <span className="font-medium">{d.hours}h</span>
                  <span className="text-xs text-[#8a8278] ml-2">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a8278]">₱</span>
                  <input
                    type="number"
                    value={editPrices[d.hours] || 0}
                    onChange={(e) =>
                      setEditPrices({
                        ...editPrices,
                        [d.hours]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-20 px-2 py-1 border border-[#e5e2db] rounded-lg text-sm font-medium text-[#0f1b2d] focus:border-[#c9a84c] outline-none"
                    min="0"
                    step="10"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowPriceModal(false)}
              className="flex-1 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
              Cancel
            </button>
            <button
              onClick={savePrices}
              className="flex-1 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
              Save Prices
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderWifiModal() {
    const [wifiInput, setWifiInput] = useState(wifiPassword);

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6">
          <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
            <i className="fas fa-wifi text-blue-500 mr-2"></i>WiFi Settings
          </h3>
          <p className="text-xs text-[#8a8278] mb-4">
            Set the WiFi password that guests will see on their portal
          </p>

          <div className="mb-4">
            <label className="text-sm font-medium text-[#0f1b2d] block mb-1">
              WiFi Password / Network name
            </label>
            <input
              type="text"
              value={wifiInput}
              onChange={(e) => setWifiInput(e.target.value)}
              placeholder="e.g. resort_wifi_2025"
              className="w-full px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowWifiModal(false)}
              className="flex-1 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
              Cancel
            </button>
            <button
              onClick={() => updateWifiPassword(wifiInput)}
              className="flex-1 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
              <i className="fas fa-save mr-1"></i>Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderMenuModal() {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
            <i className="fas fa-utensils text-purple-500 mr-2"></i>Room Service
            Menu
          </h3>
          <p className="text-xs text-[#8a8278] mb-4">
            Upload up to 6 menu photos. Guests will see them in a gallery.
          </p>

          {menuImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {menuImages.map((img, idx) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.image_url}
                    alt={`Menu ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-[#e5e2db]"
                  />
                  <button
                    onClick={() => handleMenuRemove(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition">
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#f7f3ee] rounded-xl p-6 text-center text-[#8a8278] mb-4">
              <i className="fas fa-image text-3xl mb-2 block opacity-40"></i>
              <p className="text-sm">No menu images uploaded</p>
            </div>
          )}

          {menuImages.length < 6 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#0f1b2d] mb-1">
                Add new menu image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleMenuUpload}
                disabled={uploading}
                className="w-full px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[#0f1b2d] file:text-white file:text-sm file:rounded-lg hover:file:opacity-90 transition"
              />
              {uploading && (
                <div className="text-xs text-[#8a8278] mt-1">
                  <i className="fas fa-spinner fa-spin mr-1"></i>Uploading...
                </div>
              )}
            </div>
          )}

          {menuImages.length >= 6 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm text-center mb-4">
              <i className="fas fa-info-circle mr-1"></i>
              Maximum 6 images reached.
            </div>
          )}

          <button
            onClick={() => setShowMenuModal(false)}
            className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Close
          </button>
        </div>
      </div>
    );
  }

  function renderActivityPanel() {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full overflow-y-auto">
          <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
            <div>
              <div className="font-bold">Activity Log</div>
              <div className="text-xs text-white/50">Recent events</div>
            </div>
            <button
              onClick={() => setShowActivityPanel(false)}
              className="text-white/60 hover:text-white">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="p-4">
            {activityLog.length === 0 ? (
              <div className="text-center py-8 text-[#8a8278]">
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              activityLog.map((log, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 py-3 border-b border-[#e5e2db]">
                  <div className="w-8 h-8 bg-[#f7f3ee] rounded-lg flex items-center justify-center text-[#0f1b2d]">
                    <i className="fas fa-circle-dot text-xs"></i>
                  </div>
                  <div>
                    <div className="text-sm">{log.description}</div>
                    <div className="text-xs text-[#8a8278]">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMessagesPanel() {
    const [allMessages, setAllMessages] = useState([]);

    useEffect(() => {
      const fetchAllMessages = async () => {
        const { data, error } = await supabase
          .from("messages")
          .select(
            `
            *,
            rooms(name)
          `,
          )
          .eq("hotel_id", hotel.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setAllMessages(data);
        }
      };
      fetchAllMessages();

      const subscription = supabase
        .channel("messages-channel")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `hotel_id=eq.${hotel.id}`,
          },
          (payload) => {
            setAllMessages((prev) => [payload.new, ...prev]);
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, []);

    const groupedMessages = allMessages.reduce((acc, msg) => {
      const roomId = msg.room_id;
      if (!acc[roomId]) acc[roomId] = [];
      acc[roomId].push(msg);
      return acc;
    }, {});

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full overflow-y-auto">
          <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
            <div>
              <div className="font-bold">Guest Messages</div>
              <div className="text-xs text-white/50">
                {allMessages.length} total messages
              </div>
            </div>
            <button
              onClick={() => setShowMessagesPanel(false)}
              className="text-white/60 hover:text-white">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="p-4">
            {Object.keys(groupedMessages).length === 0 ? (
              <div className="text-center py-8 text-[#8a8278]">
                <p className="text-sm">No guest messages yet</p>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([roomId, msgs]) => {
                const room = rooms.find((r) => r.id === parseInt(roomId));
                const roomName = room?.name || "Unknown Room";
                const unread = msgs.filter(
                  (m) => !m.is_read && m.sender === "guest",
                ).length;

                return (
                  <div
                    key={roomId}
                    className="mb-4 border border-[#e5e2db] rounded-xl overflow-hidden">
                    <div className="p-3 bg-[#f7f3ee] flex justify-between items-center border-b border-[#e5e2db]">
                      <span className="font-medium text-sm">{roomName}</span>
                      {unread > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {unread} new
                        </span>
                      )}
                    </div>
                    <div className="p-3 max-h-48 overflow-y-auto">
                      {msgs.slice(0, 5).map((msg) => (
                        <div
                          key={msg.id}
                          className="py-1 border-b border-[#e5e2db] text-xs flex justify-between">
                          <span>
                            {msg.sender === "admin" ? "🛎️ Admin" : "👤 Guest"}:
                            <span
                              className={
                                !msg.is_read && msg.sender === "guest"
                                  ? "font-bold"
                                  : ""
                              }>
                              {msg.message}
                            </span>
                          </span>
                          <span className="text-[#8a8278]">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {msgs.length > 5 && (
                        <div className="text-xs text-[#8a8278] text-center py-1">
                          +{msgs.length - 5} more messages
                        </div>
                      )}
                    </div>
                    <div className="p-2 bg-[#fafafa] border-t border-[#e5e2db]">
                      <button
                        onClick={() => {
                          const room = rooms.find(
                            (r) => r.id === parseInt(roomId),
                          );
                          if (room) {
                            setShowMessagesPanel(false);
                            setSelectedRoom(room);
                            setShowRoomDetail(true);
                          }
                        }}
                        className="w-full py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
                        <i className="fas fa-reply mr-1"></i>Open Chat
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderSettingsPanel() {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full overflow-y-auto">
          <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
            <div>
              <div className="font-bold">Settings</div>
              <div className="text-xs text-white/50">{hotel?.name}</div>
            </div>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="text-white/60 hover:text-white">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <div className="p-4">
            {/* Property Info */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Property info
            </div>
            <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm leading-relaxed">
              <div>
                <b>Hotel:</b> {hotel?.name}
              </div>
              <div>
                <b>Owner:</b> {hotel?.owner}
              </div>
              <div>
                <b>Email:</b> {hotel?.email}
              </div>
              <div>
                <b>Rooms:</b> {rooms.length}
              </div>
              <div>
                <b>Plan:</b> {hotel?.plan || "Basic"}
              </div>
            </div>

            {/* Current Prices */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Current Prices
            </div>
            <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm leading-relaxed">
              {[1, 3, 6, 12, 24].map((h) => (
                <div key={h}>
                  <b>{h}h:</b> ₱{prices[h] || 0}
                </div>
              ))}
            </div>

            {/* WiFi */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              WiFi
            </div>
            <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm">
              <div>
                <b>Current password:</b> {wifiPassword || "(not set)"}
              </div>
              <button
                onClick={() => {
                  setShowSettingsPanel(false);
                  setShowWifiModal(true);
                }}
                className="mt-2 px-4 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
                <i className="fas fa-edit mr-1"></i>Change WiFi
              </button>
            </div>

            {/* Room Service Menu */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Room Service Menu
            </div>
            <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm">
              {menuImages.length === 0 ? (
                <span className="text-[#8a8278]">No menu images uploaded</span>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {menuImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.image_url}
                      alt="Menu"
                      className="h-20 w-full object-cover rounded-lg border"
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  setShowSettingsPanel(false);
                  setShowMenuModal(true);
                }}
                className="mt-2 px-4 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
                <i className="fas fa-edit mr-1"></i>Manage Menu (
                {menuImages.length}/6)
              </button>
            </div>

            {/* Plan limits */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
              Plan limits
            </div>
            <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-xs text-[#8a8278] leading-relaxed">
              <div>Basic — up to 20 rooms · ₱299/mo</div>
              <div>Pro — up to 50 rooms · ₱599/mo</div>
              <div>Unlimited — no limit · ₱999/mo</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderRoomDetail() {
    const room = selectedRoom;
    if (!room) return null;

    const status = room.booking
      ? getRoomStatus(room.booking.end_time)
      : room.status || "available";
    const meta = getStatusMeta(status);
    const roomMessages = messages[room.id] || [];
    const [reply, setReply] = useState("");
    const [notes, setNotes] = useState(room.notes || "");

    const sendReply = async () => {
      if (!reply.trim()) return;
      await handleSendMessage(room.id, reply, "admin");
      setReply("");
      fetchMessages();
    };

    const saveNotes = async () => {
      await handleSaveNotes(room.id, notes);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full overflow-y-auto">
          <div className="sticky top-0 bg-[#0f1b2d] text-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-lg">{room.name}</div>
                <div className="text-xs text-white/60">
                  {meta.label} • Token: {room.token}
                </div>
              </div>
              <button
                onClick={() => setShowRoomDetail(false)}
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
              {roomMessages.length === 0 ? (
                <p className="text-[#8a8278] text-center text-sm py-4">
                  No messages yet
                </p>
              ) : (
                roomMessages.map((msg) => (
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
                  onClick={() => {
                    setShowRoomDetail(false);
                    setShowCheckinModal(true);
                  }}
                  className="w-full py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sign-in-alt"></i> Check In Guest
                </button>
              )}
              {(status === "occupied" || status === "expiring") && (
                <button
                  onClick={() => {
                    setShowRoomDetail(false);
                    setShowExtendModal(true);
                  }}
                  className="w-full py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-plus"></i> Extend Stay
                </button>
              )}
              {room.booking && (
                <button
                  onClick={() => {
                    if (window.confirm(`Check out ${room.name}?`)) {
                      handleCheckout(room.id);
                      setShowRoomDetail(false);
                    }
                  }}
                  className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sign-out-alt"></i> Check Out Now
                </button>
              )}
              {status === "cleaning" && (
                <button
                  onClick={() => {
                    handleMarkAvailable(room.id);
                    setShowRoomDetail(false);
                  }}
                  className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                  <i className="fas fa-sparkles"></i> Mark as Available
                </button>
              )}
              <button
                onClick={() => {
                  const url = generateQRUrl(room);
                  navigator.clipboard.writeText(url);
                  toast.success("QR URL copied to clipboard");
                }}
                className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition flex items-center justify-center gap-2">
                <i className="fas fa-qrcode"></i> Copy QR URL
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Rename ${room.name}?`)) {
                    const newName = prompt("Enter new room name:", room.name);
                    if (newName && newName.trim()) {
                      supabase
                        .from("rooms")
                        .update({ name: newName.trim() })
                        .eq("id", room.id)
                        .then(() => {
                          toast.success("Room renamed");
                          fetchRooms();
                        });
                    }
                  }
                }}
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
              onClick={saveNotes}
              className="mt-2 py-1.5 px-4 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
              <i className="fas fa-save mr-1"></i>Save notes
            </button>
          </div>
        </div>
      </div>
    );
  }
}
