// src/components/analytics/AnalyticsPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function AnalyticsPanel({ hotel, rooms, onClose }) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    totalCheckins: 0,
    totalBookings: 0,
    monthlyRevenue: [],
    dailyRevenue: [],
    revenueByDuration: {},
    occupancyTrend: [],
    roomTypeStats: [],
    roomTypePopular: "N/A",
    topDay: "N/A",
    slowDay: "N/A",
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const panelRef = useRef(null);

  // Update date range based on period
  useEffect(() => {
    const now = new Date();
    let start = new Date();

    switch (period) {
      case "weekly":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case "15days":
        start = new Date(now);
        start.setDate(now.getDate() - 15);
        break;
      case "monthly":
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
    }

    setDateRange({
      start: start.toISOString().split("T")[0],
      end: now.toISOString().split("T")[0],
    });
  }, [period]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch from revenue_summary (historical, never reset)
      const { data: summaryData, error: summaryError } = await supabase
        .from("revenue_summary")
        .select("*")
        .eq("hotel_id", hotel.id)
        .single();

      if (summaryError && summaryError.code !== "PGRST116") {
        console.error("Revenue summary error:", summaryError);
      }

      // Fetch all completed bookings for detailed analytics
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms(name, room_type)
        `,
        )
        .eq("hotel_id", hotel.id)
        .eq("status", "completed")
        .gte("created_at", new Date(dateRange.start).toISOString())
        .lte("created_at", new Date(dateRange.end + "T23:59:59").toISOString())
        .order("created_at", { ascending: true });

      if (bookingsError) throw bookingsError;

      // Calculate analytics from completed bookings
      const totalRevenue =
        bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
      const totalCheckins = bookings?.length || 0;

      // Monthly breakdown
      const monthlyMap = {};
      const dailyMap = {};
      const durationMap = {};
      const roomTypeMap = {};

      bookings?.forEach((b) => {
        const date = new Date(b.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const dayKey = date.toISOString().split("T")[0];
        const durationKey = `${b.hours}h`;
        const roomType = b.rooms?.room_type || "single";

        monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + (b.price || 0);
        dailyMap[dayKey] = (dailyMap[dayKey] || 0) + (b.price || 0);
        durationMap[durationKey] =
          (durationMap[durationKey] || 0) + (b.price || 0);
        roomTypeMap[roomType] = (roomTypeMap[roomType] || 0) + 1;
      });

      // Calculate room type stats
      const roomTypeStats = Object.entries(roomTypeMap).map(
        ([type, count]) => ({
          type: type.charAt(0).toUpperCase() + type.slice(1),
          count,
        }),
      );

      const roomTypePopular =
        roomTypeStats.length > 0
          ? roomTypeStats.reduce((a, b) => (a.count > b.count ? a : b)).type
          : "N/A";

      // Find best and worst days
      const dailyEntries = Object.entries(dailyMap);
      let topDay = "N/A";
      let slowDay = "N/A";

      if (dailyEntries.length > 0) {
        const sorted = dailyEntries.sort((a, b) => b[1] - a[1]);
        topDay = sorted[0][0];
        slowDay = sorted[sorted.length - 1][0];
      }

      // Calculate occupancy rate
      const activeBookings =
        bookings?.filter((b) => b.status === "active") || [];
      const occupancy =
        rooms?.length > 0
          ? Math.round((activeBookings.length / rooms.length) * 100)
          : 0;

      // Calculate average rate
      const averageRate =
        totalCheckins > 0 ? Math.round(totalRevenue / totalCheckins) : 0;

      // Set analytics data
      setAnalyticsData({
        totalRevenue: summaryData?.total_revenue || totalRevenue,
        totalCheckins: summaryData?.total_checkins || totalCheckins,
        totalBookings: summaryData?.total_bookings || totalCheckins,
        monthlyRevenue: Object.entries(monthlyMap).map(([month, revenue]) => ({
          month,
          revenue,
        })),
        dailyRevenue: Object.entries(dailyMap).map(([day, revenue]) => ({
          day,
          revenue,
          bookings:
            bookings?.filter((b) => b.created_at.split("T")[0] === day)
              .length || 0,
        })),
        revenueByDuration: durationMap,
        occupancyTrend:
          bookings?.map((b) => ({
            date: b.created_at,
            room: b.rooms?.name,
            revenue: b.price,
            hours: b.hours,
          })) || [],
        roomTypeStats,
        roomTypePopular,
        topDay,
        slowDay,
        occupancy,
        averageRate,
        revenue: totalRevenue,
        bookings: totalCheckins,
        checkins: activeBookings.length,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const currentStats = analyticsData;
  const dailyData = currentStats.dailyRevenue || [];
  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue), 1);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-4xl h-full p-6 animate-slide-in flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f1b2d]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-4xl h-full overflow-y-auto p-6 animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b border-[#e5e2db] z-10">
          <div>
            <h2 className="text-xl font-bold text-[#0f1b2d]">
              <i className="fas fa-chart-pie mr-2 text-[#c9a84c]"></i>
              Analytics Dashboard
            </h2>
            <p className="text-sm text-[#8a8278] mt-1">
              Permanent historical business performance insights
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8278] hover:text-[#0f1b2d]">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { id: "weekly", label: "This Week" },
            { id: "15days", label: "15 Days" },
            { id: "monthly", label: "This Month" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                period === p.id
                  ? "bg-[#0f1b2d] text-white"
                  : "bg-[#f7f3ee] text-[#8a8278] hover:bg-[#e5e2db]"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="text-xs text-blue-600 font-medium">
              Total Revenue (Lifetime)
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              ₱{currentStats.totalRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-500 mt-1">
              <i className="fas fa-coins mr-1"></i> {currentStats.totalBookings}{" "}
              bookings
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="text-xs text-green-600 font-medium">
              Completed Check-ins
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              {currentStats.totalCheckins}
            </div>
            <div className="text-[10px] text-green-500 mt-1">
              <i className="fas fa-users mr-1"></i> All time
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="text-xs text-purple-600 font-medium">
              Occupancy Rate
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              {currentStats.occupancy || 0}%
            </div>
            <div className="text-[10px] text-purple-500 mt-1">
              <i className="fas fa-building mr-1"></i> {rooms?.length || 0}{" "}
              total rooms
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
            <div className="text-xs text-amber-600 font-medium">
              Average Rate
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              ₱{currentStats.averageRate || 0}
            </div>
            <div className="text-[10px] text-amber-500 mt-1">
              <i className="fas fa-tag mr-1"></i> Per booking
            </div>
          </div>
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white border border-[#e5e2db] rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-[#0f1b2d]">
              <i className="fas fa-chart-bar mr-2 text-[#c9a84c]"></i>
              Daily Revenue (Selected Period)
            </h3>
            <span className="text-xs text-[#8a8278]">
              {dailyData.length} days
            </span>
          </div>

          {dailyData.length === 0 ? (
            <div className="text-center py-8 text-[#8a8278]">
              <i className="fas fa-inbox text-3xl mb-2 block opacity-40"></i>
              <p className="text-sm">No data available for this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {dailyData.map((day, index) => {
                const height =
                  maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col items-center">
                      <div className="text-[10px] font-bold text-[#0f1b2d]">
                        ₱{day.revenue}
                      </div>
                      <div
                        className="w-full bg-[#c9a84c] rounded-t transition-all duration-500 hover:bg-[#b8963a] cursor-pointer"
                        style={{
                          height: `${Math.max(height, 5)}%`,
                          minHeight: "5px",
                        }}>
                        <div className="text-[8px] text-white text-center opacity-0 hover:opacity-100 transition">
                          {day.bookings}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#8a8278] mt-1 font-medium">
                      {day.day}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Room Type Popularity */}
          <div className="bg-white border border-[#e5e2db] rounded-xl p-4">
            <h3 className="font-semibold text-[#0f1b2d] text-sm mb-3">
              <i className="fas fa-bed mr-2 text-[#c9a84c]"></i>
              Room Type Popularity
            </h3>
            {currentStats.roomTypeStats?.length === 0 ? (
              <p className="text-xs text-[#8a8278] text-center py-4">
                No data yet
              </p>
            ) : (
              <div className="space-y-2">
                {currentStats.roomTypeStats?.map((type, index) => {
                  const total =
                    currentStats.roomTypeStats?.reduce(
                      (sum, t) => sum + t.count,
                      0,
                    ) || 1;
                  const percentage =
                    total > 0 ? Math.round((type.count / total) * 100) : 0;
                  const colors = [
                    "#3b82f6",
                    "#8b5cf6",
                    "#f59e0b",
                    "#10b981",
                    "#ef4444",
                  ];
                  const color = colors[index % colors.length];
                  return (
                    <div key={type.type}>
                      <div className="flex justify-between text-xs">
                        <span>{type.type}</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-[#f7f3ee] rounded-full mt-1">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-[10px] text-[#8a8278] mt-3">
              Most popular:{" "}
              <span className="font-medium text-[#0f1b2d]">
                {currentStats.roomTypePopular || "N/A"}
              </span>
            </div>
          </div>

          {/* Best & Worst Days */}
          <div className="bg-white border border-[#e5e2db] rounded-xl p-4">
            <h3 className="font-semibold text-[#0f1b2d] text-sm mb-3">
              <i className="fas fa-calendar-day mr-2 text-[#c9a84c]"></i>
              Performance Days
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                  <i className="fas fa-arrow-up"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-[#0f1b2d]">
                    Best Day
                  </div>
                  <div className="text-xs text-[#8a8278]">
                    {currentStats.topDay || "N/A"}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm font-bold text-green-600">
                    Highest
                  </div>
                  <div className="text-[10px] text-[#8a8278]">
                    Revenue & occupancy
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm">
                  <i className="fas fa-arrow-down"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-[#0f1b2d]">
                    Slow Day
                  </div>
                  <div className="text-xs text-[#8a8278]">
                    {currentStats.slowDay || "N/A"}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-sm font-bold text-red-600">Lowest</div>
                  <div className="text-[10px] text-[#8a8278]">
                    Revenue & occupancy
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-6 p-4 bg-[#f7f3ee] rounded-xl border border-[#e5e2db]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-[10px] text-[#8a8278]">Total Bookings</div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {currentStats.totalBookings}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">
                Completed Check-ins
              </div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {currentStats.totalCheckins}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">Lifetime Revenue</div>
              <div className="text-lg font-bold text-[#c9a84c]">
                ₱{currentStats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">Occupancy</div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {currentStats.occupancy || 0}%
              </div>
            </div>
          </div>
        </div>

        {/* Note about data */}
        <div className="mt-4 text-xs text-[#8a8278] text-center border-t border-[#e5e2db] pt-4">
          <i className="fas fa-info-circle mr-1"></i>
          Analytics data is historical and permanent. Dashboard revenue is
          separate and resettable.
        </div>
      </div>
    </div>
  );
}
