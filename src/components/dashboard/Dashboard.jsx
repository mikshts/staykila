// src/components/dashboard/Dashboard.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import StatsCards from "./StatsCards";
import RoomGrid from "./RoomGrid";
import RoomList from "./RoomList";
import ReportsPanel from "../reports/ReportsPanel";
import { DashboardSkeleton } from "../ui";
import QRDownload from "./QRDownload";
import { buildGuestUrl } from "../../lib/guestUrl";
import CalendarManager from "../settings/CalendarManager";
import AnalyticsPanel from "../analytics/AnalyticsPanel";
import BillingCard from "../billing/BillingCard";
import { useSubscription } from "../../hooks/useSubscription";
import TrialBanner from "../billing/TrialBanner";
import { useNavigate } from "react-router-dom";

import {
  CheckinModal,
  ExtendModal,
  PriceModal,
  WifiModal,
  MenuModal,
  CheckoutModal,
} from "../modals";
import {
  ActivityPanel,
  MessagesPanel,
  SettingsPanel,
  RoomDetailPanel,
} from "../settings";

export default function Dashboard() {
  const { user, hotel, logout } = useAuth();
  const {
    subscription,
    isLoading: subLoading,
    isExpired,
    isTrial,
    trialDaysRemaining,
  } = useSubscription();
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
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCalendarManager, setShowCalendarManager] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showReportsPanel, setShowReportsPanel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showQRDownload, setShowQRDownload] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutRoom, setCheckoutRoom] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [messages, setMessages] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);

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
  const [editPrices, setEditPrices] = useState({});
  const [wifiPassword, setWifiPassword] = useState("");
  const [menuImages, setMenuImages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [timerTick, setTimerTick] = useState(0);

  const timerIntervalRef = useRef(null);
  const roomsRef = useRef(rooms);

  // Keep roomsRef in sync with rooms state
  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  // Timer tick - increments every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update timers whenever timerTick changes
  useEffect(() => {
    const currentRooms = roomsRef.current;
    const timerElements = document.querySelectorAll("[data-timer]");

    if (timerElements.length === 0) return;

    timerElements.forEach((el) => {
      const roomId = el.dataset.timer;
      if (!roomId) return;

      const room = currentRooms.find((r) => r.id === parseInt(roomId));
      if (room?.booking) {
        const countdown = formatCountdown(room.booking.end_time);
        if (el.textContent !== countdown) {
          el.textContent = countdown;
        }
        const status = getRoomStatus(room.booking.end_time);
        // Update class for status styling
        el.className =
          `timer-display text-2xl font-bold font-mono ` +
          (status === "expiring"
            ? "text-orange-500 animate-pulse"
            : status === "expired"
              ? "text-red-500"
              : "text-green-600");
      }
    });
  }, [timerTick]); // Re-run every second

  // Fetch data on mount
  useEffect(() => {
    if (hotel?.id) {
      fetchRooms();
      fetchHotelSettings();
      fetchMessages();
      fetchActivityLogs();
      fetchDashboardMetrics(); // Add this
    }

    // Add event listener for refreshRooms
    const handleRefreshRooms = () => {
      fetchRooms();
    };

    window.addEventListener("refreshRooms", handleRefreshRooms);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      window.removeEventListener("refreshRooms", handleRefreshRooms);
    };
  }, [hotel]);

  // Fetch functions
  const fetchHotelSettings = async () => {
    try {
      const { data: hotelData, error: hotelError } = await supabase
        .from("hotels")
        .select("wifi_password")
        .eq("id", hotel.id)
        .single();

      if (!hotelError && hotelData) {
        setWifiPassword(hotelData.wifi_password || "");
      }

      const { data: menuData, error: menuError } = await supabase
        .from("menu_images")
        .select("*")
        .eq("hotel_id", hotel.id)
        .order("display_order");

      if (!menuError && menuData) {
        setMenuImages(menuData);
      }

      const { data: pricingData, error: pricingError } = await supabase
        .from("pricing")
        .select("*")
        .eq("hotel_id", hotel.id);

      if (!pricingError && pricingData) {
        const priceMap = {};
        pricingData.forEach((p) => {
          const key = `${p.room_type || "single"}_${p.duration_hours}`;
          priceMap[key] = p.price;
        });
        setPrices(priceMap);
        setEditPrices(priceMap);
      }
    } catch (error) {
      console.error("Error fetching hotel settings:", error);
    }
  };

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
  useEffect(() => {
    if (!soundEnabled) return;

    // Check for expiring rooms every second
    const checkExpiringRooms = () => {
      const now = new Date();
      const expiringRooms = rooms.filter((room) => {
        if (!room.booking || !room.booking.end_time) return false;
        const endTime = new Date(room.booking.end_time);
        const diff = (endTime - now) / 1000;
        return diff <= 10 && diff > 0;
      });

      expiringRooms.forEach((room) => {
        // Play sound for each expiring room
        playExpiringAlert();

        // Also show a toast notification
        const diff = Math.round((new Date(room.booking.end_time) - now) / 1000);
        toast(`⚠️ ${room.name} expires in ${diff} seconds!`, {
          duration: 5000,
          icon: "⏰",
          style: {
            background: "#f97316",
            color: "white",
            fontWeight: "bold",
          },
        });
      });
    };

    // Check every second
    const interval = setInterval(checkExpiringRooms, 1000);

    return () => clearInterval(interval);
  }, [rooms, soundEnabled]);
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

  // Updated fetchRooms - no longer calculates revenue from bookings
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
                    guest_phone,
                    booking_source,
                    booking_type,
                    notes    
                )
            `,
        )
        .eq("hotel_id", hotel.id)
        .order("room_number");

      if (error) throw error;

      const processedRooms = (data || []).map((room) => {
        const bookings = room.bookings || [];

        const activeBooking = bookings.find((b) => b.status === "active");
        const now = new Date();
        const futureBookings = bookings.filter(
          (b) => b.status === "booked" && new Date(b.start_time) > now,
        );

        futureBookings.sort(
          (a, b) => new Date(a.start_time) - new Date(b.start_time),
        );

        const nextBooking =
          futureBookings.length > 0 ? futureBookings[0] : null;

        room.booking = null;
        room.bookingStatus = "available";
        room.futureBookings = [];

        if (activeBooking) {
          room.booking = activeBooking;
          room.bookingStatus = "occupied";
          room.status = getRoomStatus(activeBooking.end_time);
          room.displayMode = "occupied";
          room.futureBookings = futureBookings;
        } else if (nextBooking) {
          room.booking = nextBooking;
          room.bookingStatus = "booked";
          room.displayMode = "available";
          room.bookingDate = new Date(nextBooking.start_time);
          room.futureBookings = futureBookings;
          room.status = "available";
        } else {
          room.booking = null;
          room.bookingStatus = "available";
          room.displayMode = "available";
          room.futureBookings = [];
          if (
            room.status === "occupied" ||
            room.status === "expired" ||
            room.status === "expiring"
          ) {
            room.status = "available";
          }
          const completedBooking = bookings.find(
            (b) => b.status === "completed",
          );
          if (completedBooking) {
            room.lastBooking = completedBooking;
          }
        }
        return room;
      });

      setRooms(processedRooms);

      // Calculate room stats
      const newStats = {
        available: 0,
        occupied: 0,
        expiring: 0,
        expired: 0,
        cleaning: 0,
        booked: 0,
      };

      processedRooms.forEach((room) => {
        const status = room.status || "available";
        if (newStats[status] !== undefined) {
          newStats[status]++;
        }
      });

      setStats(newStats);

      const totalRooms = processedRooms.length;
      const occupied = newStats.occupied + newStats.expiring + newStats.expired;
      const occupancyRate =
        totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

      // Revenue is now from dashboard_metrics
      // We'll set it from fetchDashboardMetrics

      // Only set occupancy rate here
      setRevenue((prev) => ({
        ...prev,
        occupancyRate: occupancyRate,
      }));

      // Fetch dashboard metrics separately
      await fetchDashboardMetrics();
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
      booked: {
        label: "Booked",
        color: "bg-purple-100 text-purple-700",
        dot: "bg-purple-500",
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
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalRevenue: 0,
    totalCheckins: 0,
    totalActiveBookings: 0,
  });
  useEffect(() => {
    setRevenue((prev) => ({
      ...prev,
      total: dashboardMetrics.totalRevenue || 0,
      totalCheckins: dashboardMetrics.totalCheckins || 0,
      totalBookings: dashboardMetrics.totalCheckins || 0,
    }));
  }, [dashboardMetrics]);
  // Fetch dashboard metrics separately
  const fetchDashboardMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("dashboard_metrics")
        .select("*")
        .eq("hotel_id", hotel.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setDashboardMetrics({
          totalRevenue: data.total_revenue || 0,
          totalCheckins: data.total_checkins || 0,
          totalActiveBookings: data.total_active_bookings || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
    }
  };

  // Updated handleCheckin
  const handleCheckin = async (roomId, hours, calculatedPrice, roomType) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) return;

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + hours * 3600000);

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          room_id: roomId,
          hotel_id: hotel.id,
          guest_name: roomType
            ? `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Room`
            : "Guest",
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          hours: hours,
          price: calculatedPrice,
          status: "active",
          checked_in_at: startTime.toISOString(),
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      const { error: roomError } = await supabase
        .from("rooms")
        .update({
          status: "occupied",
          room_type: roomType,
        })
        .eq("id", roomId);

      if (roomError) throw roomError;

      // Dashboard revenue is now updated automatically by the trigger
      // But we fetch it to keep UI in sync

      const roomTypeLabel = roomType
        ? roomType.charAt(0).toUpperCase() + roomType.slice(1)
        : "Single";

      await logActivity(
        "checkin",
        `${room.name} checked in (${roomTypeLabel}) for ${hours}h (₱${calculatedPrice})`,
      );

      toast.success(
        `${room.name} checked in for ${hours} hours (${roomTypeLabel})`,
      );
      setShowCheckinModal(false);
      await fetchRooms();
      await fetchDashboardMetrics();
      await fetchMessages();
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

      // 1. Update the booking
      const { error } = await supabase
        .from("bookings")
        .update({
          end_time: newEndTime.toISOString(),
          hours: room.booking.hours + hours,
          price: room.booking.price + price,
        })
        .eq("id", room.booking.id);

      if (error) throw error;

      // 2. ✅ Add extension revenue to dashboard
      const { error: dashboardError } = await supabase.rpc(
        "add_extension_revenue",
        {
          p_hotel_id: hotel.id,
          p_additional_price: price,
        },
      );

      if (dashboardError) {
        console.error("Failed to update dashboard revenue:", dashboardError);
        toast.warning(
          "Booking extended but dashboard revenue may be out of sync",
        );
      }

      await logActivity(
        "extend",
        `${room.name} extended by ${hours}h (₱${price})`,
      );

      toast.success(`${room.name} extended by ${hours} hours`);
      setShowExtendModal(false);
      fetchRooms();
      await fetchDashboardMetrics(); // ✅ Refresh dashboard metrics
    } catch (error) {
      console.error("Extend error:", error);
      toast.error("Failed to extend stay");
    }
  };

  // Updated handleCheckout
  const handleCheckout = async (roomId) => {
    try {
      const room = rooms.find((r) => r.id === roomId);
      if (!room || !room.booking) return;

      // NOTE: We do NOT subtract revenue here!
      // The booking status changes from 'active' to 'completed'
      // The trigger will:
      // 1. Update analytics (revenue_summary) with the completed booking
      // 2. Remove from dashboard active bookings count (but keep revenue)
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
      setShowCheckoutModal(false);
      setCheckoutRoom(null);
      await fetchRooms();
      await fetchDashboardMetrics();
      await fetchMessages();
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to checkout");
    }
  };

  const openCheckoutModal = (room) => {
    setCheckoutRoom(room);
    setShowCheckoutModal(true);
  };

  // Updated handleResetTotals
  const handleResetTotals = async () => {
    try {
      setLoading(true);

      // Call the database function to reset dashboard metrics
      const { error } = await supabase.rpc("reset_dashboard_metrics", {
        p_hotel_id: hotel.id,
      });

      if (error) throw error;

      await logActivity("reset", `Dashboard metrics reset to 0`);

      toast.success("Dashboard totals have been reset");
      setShowResetModal(false);

      // Refresh dashboard metrics
      await fetchDashboardMetrics();
      await fetchRooms();
      await fetchActivityLogs();
    } catch (error) {
      console.error("Error resetting totals:", error);
      toast.error("Failed to reset totals: " + error.message);
    } finally {
      setLoading(false);
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
      const pricingData = [];
      Object.entries(editPrices).forEach(([key, price]) => {
        if (price === undefined || price === null || price === "") return;

        const parts = key.split("_");
        if (parts.length === 2) {
          const roomType = parts[0];
          const duration = parseInt(parts[1]);
          if (roomType && duration && price > 0) {
            pricingData.push({
              hotel_id: hotel.id,
              duration_hours: duration,
              price: parseFloat(price),
              room_type: roomType,
            });
          }
        }
      });

      if (pricingData.length === 0) {
        toast.error("No valid prices to save");
        return;
      }

      const { error } = await supabase.from("pricing").upsert(pricingData, {
        onConflict: "hotel_id,duration_hours,room_type",
      });

      if (error) throw error;

      setPrices(editPrices);
      toast.success("Prices updated successfully!");
      setShowPriceModal(false);
      fetchRooms();
    } catch (error) {
      console.error("Error saving prices:", error);
      toast.error("Failed to save prices: " + error.message);
    }
  };

  const handleMenuUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${hotel.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("menu_images").insert({
        hotel_id: hotel.id,
        image_url: urlData.publicUrl,
        display_order: menuImages.length,
      });

      if (insertError) {
        await supabase.storage.from("menu-images").remove([filePath]);
        toast.error(`Failed to save menu: ${insertError.message}`);
        return;
      }

      toast.success("Menu image uploaded successfully!");
      await fetchHotelSettings();
      setShowMenuModal(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        "Failed to upload image: " + (error.message || "Unknown error"),
      );
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

  const generateQRUrl = (room) => {
    return buildGuestUrl(hotel.id, room.id, room.name);
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        hotelName={hotel?.name}
        roomCount={rooms.length}
        occupancyRate={revenue.occupancyRate}
        filter={filter}
        isExpired={isExpired}
        onFilterChange={(f) => {
          setFilter(f);
          setSidebarOpen(false);
        }}
        stats={stats}
        unreadCount={unreadCount}
        onMessagesClick={() => {
          setShowMessagesPanel(true);
          setSidebarOpen(false);
        }}
        onActivityClick={() => {
          setShowActivityPanel(true);
          setSidebarOpen(false);
        }}
        onAnalyticsClick={() => {
          setShowAnalyticsPanel(true);
          setSidebarOpen(false);
        }}
        onSettingsClick={() => {
          setShowSettingsPanel(true);
          setSidebarOpen(false);
        }}
        onPriceClick={() => {
          setShowPriceModal(true);
          setSidebarOpen(false);
        }}
        onQRDownloadClick={() => {
          setShowQRDownload(true);
          setSidebarOpen(false);
        }}
        onReportsClick={() => {
          setShowReportsPanel(true);
          setSidebarOpen(false);
        }}
        onWifiClick={() => {
          setShowWifiModal(true);
          setSidebarOpen(false);
        }}
        onMenuClick={() => {
          setShowMenuModal(true);
          setSidebarOpen(false);
        }}
        onCalendarClick={() => {
          setShowCalendarManager(true);
          setSidebarOpen(false);
        }}
        user={user}
        onLogout={logout}
        onResetTotals={() => setShowResetModal(true)}
      />
      <main className="flex-1 min-w-0">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          view={view}
          onViewChange={setView}
          soundEnabled={soundEnabled}
          onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        />

        <div className="p-4">
          <StatsCards stats={stats} revenue={revenue} />
          {/* Inside the Dashboard component, after StatsCards */}
          {isTrial && trialDaysRemaining <= 7 && trialDaysRemaining > 0 && (
            <TrialBanner
              daysRemaining={trialDaysRemaining}
              onSubscribe={() => {
                // You can either navigate to /billing or trigger handleSubscribe from there
                navigate("/billing");
              }}
            />
          )}
          {/* Subscription Banner */}
          <BillingCard />
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {/* All button - always shows total rooms */}
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === "all"
                  ? "bg-[#0f1b2d] text-white border-[#0f1b2d]"
                  : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-[#0f1b2d] hover:text-[#0f1b2d]"
              }`}>
              <i className="fas fa-th-list"></i>
              All
              <span
                className={`text-[9px] ${filter === "all" ? "text-white/60" : "text-[#8a8278]/50"}`}>
                ({rooms.length})
              </span>
            </button>

            {/* Available button */}
            <button
              onClick={() => setFilter("available")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === "available"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-green-500 hover:text-green-600"
              }`}>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Available
              {stats.available > 0 && (
                <span
                  className={`text-[9px] ${filter === "available" ? "text-white/60" : "text-green-600"}`}>
                  ({stats.available})
                </span>
              )}
            </button>

            {/* Occupied button - with red indicator */}
            <button
              onClick={() => setFilter("occupied")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === "occupied"
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-red-500 hover:text-red-600"
              }`}>
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              Occupied
              {stats.occupied > 0 && (
                <span
                  className={`text-[9px] ${filter === "occupied" ? "text-white/60" : "text-red-600"}`}>
                  ({stats.occupied})
                </span>
              )}
            </button>

            {/* Expiring button - with orange indicator and pulse if > 0 */}
            <button
              onClick={() => setFilter("expiring")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === "expiring"
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-orange-500 hover:text-orange-500"
              }`}>
              <span
                className={`w-2 h-2 rounded-full bg-orange-500 inline-block ${stats.expiring > 0 ? "animate-pulse" : ""}`}></span>
              Expiring
              {stats.expiring > 0 && (
                <span
                  className={`text-[9px] font-bold ${filter === "expiring" ? "text-white" : "text-orange-500"}`}>
                  ({stats.expiring})
                </span>
              )}
            </button>

            {/* Expired button - with gray/dark indicator */}
            <button
              onClick={() => setFilter("expired")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === "expired"
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-gray-500 hover:text-gray-700"
              }`}>
              <span className="w-2 h-2 rounded-full bg-gray-500 inline-block"></span>
              Expired
              {stats.expired > 0 && (
                <span
                  className={`text-[9px] ${filter === "expired" ? "text-white/60" : "text-gray-600"}`}>
                  ({stats.expired})
                </span>
              )}
            </button>

            {/* Cleaning button - with blue indicator and glow if > 0 */}
            <button
              onClick={() => setFilter("cleaning")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === "cleaning"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-blue-500 hover:text-blue-600"
              }`}>
              <span
                className={`w-2 h-2 rounded-full bg-blue-500 inline-block ${stats.cleaning > 0 ? "shadow-[0_0_6px_#3b82f6]" : ""}`}></span>
              Cleaning
              {stats.cleaning > 0 && (
                <span
                  className={`text-[9px] font-bold ${filter === "cleaning" ? "text-white" : "text-blue-600"}`}>
                  ({stats.cleaning})
                </span>
              )}
            </button>

            {/* Search bar */}
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
          {view === "grid" ? (
            <RoomGrid
              rooms={filteredRooms()}
              onRoomAction={(action, room) => {
                setSelectedRoom(room);
                if (action === "checkin") setShowCheckinModal(true);
                else if (action === "extend") setShowExtendModal(true);
                else if (action === "detail") setShowRoomDetail(true);
                else if (action === "checkout") {
                  openCheckoutModal(room);
                }
              }}
              onMarkAvailable={handleMarkAvailable}
              formatTime={formatTime}
              formatCountdown={formatCountdown}
              getRoomStatus={getRoomStatus}
              getStatusMeta={getStatusMeta}
              getUnreadForRoom={getUnreadForRoom}
            />
          ) : (
            <RoomList
              rooms={filteredRooms()}
              onRoomAction={(action, room) => {
                setSelectedRoom(room);
                if (action === "checkin") setShowCheckinModal(true);
                else if (action === "extend") setShowExtendModal(true);
                else if (action === "detail") setShowRoomDetail(true);
                else if (action === "checkout") {
                  openCheckoutModal(room);
                }
              }}
              onMarkAvailable={handleMarkAvailable}
              formatTime={formatTime}
              formatCountdown={formatCountdown}
              getRoomStatus={getRoomStatus}
              getStatusMeta={getStatusMeta}
              getUnreadForRoom={getUnreadForRoom}
            />
          )}
        </div>
      </main>

      {/* Modals and Panels */}
      {showCheckinModal && selectedRoom && (
        <CheckinModal
          room={selectedRoom}
          prices={prices}
          onCheckin={handleCheckin}
          onClose={() => setShowCheckinModal(false)}
          formatTime={formatTime}
        />
      )}
      {showAnalyticsPanel && (
        <AnalyticsPanel
          hotel={hotel}
          rooms={rooms}
          bookings={[]}
          onClose={() => setShowAnalyticsPanel(false)}
        />
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-undo-alt text-amber-600 text-2xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#0f1b2d] mb-2">
                Reset Dashboard Totals?
              </h3>
              <p className="text-sm text-[#8a8278]">
                This will reset your <strong>Dashboard revenue counters</strong>{" "}
                to zero.
              </p>
              <p className="text-sm text-[#8a8278] mt-2">
                ✅ Historical analytics data will NOT be affected
                <br />
                ✅ Booking records will NOT be deleted
                <br />✅ Revenue history will NOT be lost
              </p>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <i className="fas fa-info-circle mr-1"></i>
                Dashboard = Operational counter (resettable)
                <br />
                Analytics = Permanent historical record (never reset)
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 px-4 py-2 border border-[#e5e2db] rounded-lg text-sm font-medium hover:bg-[#f7f3ee] transition">
                Cancel
              </button>
              <button
                onClick={handleResetTotals}
                className="flex-1 px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-medium hover:bg-[#b8963a] transition">
                Yes, Reset Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      {showExtendModal && selectedRoom && (
        <ExtendModal
          room={selectedRoom}
          prices={prices}
          onExtend={handleExtend}
          onClose={() => setShowExtendModal(false)}
          formatTime={formatTime}
          formatCountdown={formatCountdown}
        />
      )}

      {showPriceModal && (
        <PriceModal
          prices={editPrices}
          onPricesChange={setEditPrices}
          onSave={savePrices}
          onClose={() => setShowPriceModal(false)}
        />
      )}

      {showQRDownload && (
        <QRDownload
          hotel={hotel}
          rooms={rooms}
          onClose={() => setShowQRDownload(false)}
        />
      )}

      {showWifiModal && (
        <WifiModal
          currentPassword={wifiPassword}
          onSave={updateWifiPassword}
          onClose={() => setShowWifiModal(false)}
        />
      )}

      {showCheckoutModal && checkoutRoom && (
        <CheckoutModal
          room={checkoutRoom}
          onConfirm={() => handleCheckout(checkoutRoom.id)}
          onClose={() => {
            setShowCheckoutModal(false);
            setCheckoutRoom(null);
          }}
        />
      )}

      {showReportsPanel && (
        <ReportsPanel
          hotel={hotel}
          onClose={() => setShowReportsPanel(false)}
        />
      )}

      {showMenuModal && (
        <MenuModal
          menuImages={menuImages}
          onUpload={handleMenuUpload}
          onRemove={handleMenuRemove}
          onClose={() => setShowMenuModal(false)}
        />
      )}
      {showCalendarManager && (
        <CalendarManager
          hotel={hotel}
          rooms={rooms}
          onClose={() => setShowCalendarManager(false)}
        />
      )}
      {showActivityPanel && (
        <ActivityPanel
          logs={activityLog}
          onClose={() => setShowActivityPanel(false)}
        />
      )}

      {showMessagesPanel && (
        <MessagesPanel
          rooms={rooms}
          onClose={() => setShowMessagesPanel(false)}
          onOpenChat={(room) => {
            setShowMessagesPanel(false);
            setSelectedRoom(room);
            setShowRoomDetail(true);
          }}
        />
      )}

      {showSettingsPanel && (
        <SettingsPanel
          hotel={hotel}
          rooms={rooms}
          prices={prices}
          wifiPassword={wifiPassword}
          menuImages={menuImages}
          onClose={() => setShowSettingsPanel(false)}
          onOpenWifi={() => {
            setShowSettingsPanel(false);
            setShowWifiModal(true);
          }}
          onOpenMenu={() => {
            setShowSettingsPanel(false);
            setShowMenuModal(true);
          }}
          onOpenPrice={() => {
            setShowSettingsPanel(false);
            setShowPriceModal(true);
          }}
        />
      )}

      {showRoomDetail && selectedRoom && (
        <RoomDetailPanel
          room={selectedRoom}
          messages={messages[selectedRoom.id] || []}
          onClose={() => setShowRoomDetail(false)}
          onSendMessage={handleSendMessage}
          onSaveNotes={handleSaveNotes}
          onCheckin={() => {
            setShowRoomDetail(false);
            setShowCheckinModal(true);
          }}
          onExtend={() => {
            setShowRoomDetail(false);
            setShowExtendModal(true);
          }}
          onCheckout={() => {
            setShowRoomDetail(false);
            openCheckoutModal(selectedRoom);
          }}
          onMarkAvailable={() => {
            handleMarkAvailable(selectedRoom.id);
            setShowRoomDetail(false);
          }}
          onCopyQR={generateQRUrl}
          onRename={() => {
            const newName = prompt("Enter new room name:", selectedRoom.name);
            if (newName && newName.trim()) {
              supabase
                .from("rooms")
                .update({ name: newName.trim() })
                .eq("id", selectedRoom.id)
                .then(() => {
                  toast.success("Room renamed");
                  fetchRooms();
                });
            }
          }}
          formatTime={formatTime}
          formatCountdown={formatCountdown}
          getRoomStatus={getRoomStatus}
          getStatusMeta={getStatusMeta}
          getUnreadForRoom={getUnreadForRoom}
          hotelId={hotel?.id}
        />
      )}
    </div>
  );
}
