// src/components/analytics/AnalyticsPanel.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function AnalyticsPanel({ hotel, rooms, onClose }) {
  const [period, setPeriod] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    revenue: 0,
    checkins: 0,
    occupancy: 0,
    bookings: 0,
    averageRate: 0,
    topDay: "N/A",
    slowDay: "N/A",
    roomTypePopular: "N/A",
    dailyData: [],
    roomTypeStats: [],
    revenueByHour: [],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // 1. Get date range based on period
      const now = new Date();
      let startDate = new Date();

      if (period === "weekly") {
        startDate.setDate(now.getDate() - 7);
      } else if (period === "15days") {
        startDate.setDate(now.getDate() - 15);
      } else if (period === "monthly") {
        startDate.setMonth(now.getMonth() - 1);
      }

      const startISO = startDate.toISOString();
      const endISO = now.toISOString();

      // 2. Get all bookings for the period
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          price,
          hours,
          status,
          start_time,
          end_time,
          created_at,
          room_id,
          booking_source,
          rooms (
            room_type,
            name
          )
        `,
        )
        .eq("hotel_id", hotel.id)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .in("status", ["active", "completed", "booked"]);

      if (bookingsError) throw bookingsError;

      // 3. Calculate revenue (from active + completed)
      // AnalyticsPanel.jsx - Tama na ito
      const revenueBookings = bookings.filter(
        (b) => b.status === "active" || b.status === "completed",
      );
      const totalRevenue = revenueBookings.reduce(
        (sum, b) => sum + (b.price || 0),
        0,
      );

      // 4. Calculate check-ins (active bookings)
      const activeBookings = bookings.filter((b) => b.status === "active");
      const checkins = activeBookings.length;

      // 5. Calculate total bookings
      const totalBookings = bookings.length;

      // 6. Calculate average rate
      const avgRate =
        revenueBookings.length > 0
          ? Math.round(totalRevenue / revenueBookings.length)
          : 0;

      // 7. Calculate occupancy rate
      const totalRooms = rooms?.length || 0;
      const occupancyRate =
        totalRooms > 0
          ? Math.round((activeBookings.length / totalRooms) * 100)
          : 0;

      // 8. Daily data for chart
      const dailyMap = {};
      bookings.forEach((b) => {
        const date = new Date(b.created_at).toLocaleDateString("en-US", {
          weekday: "short",
        });
        if (!dailyMap[date]) {
          dailyMap[date] = { revenue: 0, bookings: 0 };
        }
        if (b.status === "active" || b.status === "completed") {
          dailyMap[date].revenue += b.price || 0;
        }
        dailyMap[date].bookings += 1;
      });

      const dailyData = Object.entries(dailyMap).map(([day, data]) => ({
        day,
        revenue: data.revenue,
        bookings: data.bookings,
      }));

      // Sort days
      const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      dailyData.sort(
        (a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day),
      );

      // 9. Room type popularity
      const roomTypeMap = {};
      bookings.forEach((b) => {
        if (b.rooms?.room_type) {
          const type = b.rooms.room_type;
          if (!roomTypeMap[type]) roomTypeMap[type] = 0;
          roomTypeMap[type]++;
        }
      });

      const roomTypeStats = Object.entries(roomTypeMap)
        .map(([type, count]) => ({
          type: type.charAt(0).toUpperCase() + type.slice(1),
          count,
        }))
        .sort((a, b) => b.count - a.count);

      // 10. Best and worst days
      const dayRevenueMap = {};
      bookings.forEach((b) => {
        if (b.status === "active" || b.status === "completed") {
          const day = new Date(b.created_at).toLocaleDateString("en-US", {
            weekday: "long",
          });
          if (!dayRevenueMap[day]) dayRevenueMap[day] = 0;
          dayRevenueMap[day] += b.price || 0;
        }
      });

      const dayEntries = Object.entries(dayRevenueMap);
      let topDay = "N/A",
        slowDay = "N/A";
      if (dayEntries.length > 0) {
        dayEntries.sort((a, b) => b[1] - a[1]);
        topDay = dayEntries[0]?.[0] || "N/A";
        slowDay = dayEntries[dayEntries.length - 1]?.[0] || "N/A";
      }

      // 11. Revenue by hour (for additional insight)
      const hourMap = {};
      bookings.forEach((b) => {
        if (b.status === "active" || b.status === "completed") {
          const hour = new Date(b.created_at).getHours();
          if (!hourMap[hour]) hourMap[hour] = 0;
          hourMap[hour] += b.price || 0;
        }
      });

      const revenueByHour = Object.entries(hourMap)
        .map(([hour, revenue]) => ({
          hour: parseInt(hour),
          revenue,
        }))
        .sort((a, b) => a.hour - b.hour);

      setAnalyticsData({
        revenue: totalRevenue,
        checkins,
        occupancy: occupancyRate,
        bookings: totalBookings,
        averageRate: avgRate,
        topDay,
        slowDay,
        roomTypePopular:
          roomTypeStats.length > 0 ? roomTypeStats[0].type : "N/A",
        dailyData,
        roomTypeStats,
        revenueByHour,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const currentStats = analyticsData;
  const maxRevenue = Math.max(
    ...currentStats.dailyData.map((d) => d.revenue),
    1,
  );

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
      <div className="bg-white w-full max-w-4xl h-full overflow-y-auto p-6 animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b border-[#e5e2db] z-10">
          <div>
            <h2 className="text-xl font-bold text-[#0f1b2d]">
              <i className="fas fa-chart-pie mr-2 text-[#c9a84c]"></i>
              Analytics Dashboard
            </h2>
            <p className="text-sm text-[#8a8278] mt-1">
              Real-time business performance insights
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
              Total Revenue
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              ₱{currentStats.revenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-blue-500 mt-1">
              <i className="fas fa-coins mr-1"></i> {currentStats.bookings}{" "}
              bookings
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="text-xs text-green-600 font-medium">
              Active Check-ins
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              {currentStats.checkins}
            </div>
            <div className="text-[10px] text-green-500 mt-1">
              <i className="fas fa-users mr-1"></i> Currently staying
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
            <div className="text-xs text-purple-600 font-medium">
              Occupancy Rate
            </div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              {currentStats.occupancy}%
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
              ₱{currentStats.averageRate}
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
              Daily Revenue
            </h3>
            <span className="text-xs text-[#8a8278]">
              {currentStats.dailyData.length} days
            </span>
          </div>

          {currentStats.dailyData.length === 0 ? (
            <div className="text-center py-8 text-[#8a8278]">
              <i className="fas fa-inbox text-3xl mb-2 block opacity-40"></i>
              <p className="text-sm">No data available for this period</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-48">
              {currentStats.dailyData.map((day, index) => {
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
            {currentStats.roomTypeStats.length === 0 ? (
              <p className="text-xs text-[#8a8278] text-center py-4">
                No data yet
              </p>
            ) : (
              <div className="space-y-2">
                {currentStats.roomTypeStats.map((type, index) => {
                  const total = currentStats.roomTypeStats.reduce(
                    (sum, t) => sum + t.count,
                    0,
                  );
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
                {currentStats.roomTypePopular}
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
                    {currentStats.topDay}
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
                    {currentStats.slowDay}
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
                {currentStats.bookings}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">Active Check-ins</div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {currentStats.checkins}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">Revenue</div>
              <div className="text-lg font-bold text-[#c9a84c]">
                ₱{currentStats.revenue.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">Occupancy</div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {currentStats.occupancy}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
