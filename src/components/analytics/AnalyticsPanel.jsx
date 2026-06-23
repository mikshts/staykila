import React, { useState } from "react";

export default function AnalyticsPanel({ hotel, rooms, bookings, onClose }) {
  const [period, setPeriod] = useState("weekly"); // weekly, monthly, 15days

  // Mock data for demonstration
  const stats = {
    weekly: {
      revenue: 45600,
      checkins: 28,
      occupancy: 76,
      bookings: 35,
      averageRate: 1628,
      topDay: "Saturday",
      slowDay: "Tuesday",
      roomTypePopular: "Double Bed",
    },
    monthly: {
      revenue: 185200,
      checkins: 112,
      occupancy: 72,
      bookings: 145,
      averageRate: 1653,
      topDay: "Saturday",
      slowDay: "Monday",
      roomTypePopular: "Family Room",
    },
    "15days": {
      revenue: 92300,
      checkins: 56,
      occupancy: 74,
      bookings: 72,
      averageRate: 1648,
      topDay: "Saturday",
      slowDay: "Wednesday",
      roomTypePopular: "Single Bed",
    },
  };

  const currentStats = stats[period] || stats.weekly;

  // Mock data for daily revenue chart
  const dailyData = [
    { day: "Mon", revenue: 6800, bookings: 5 },
    { day: "Tue", revenue: 4200, bookings: 3 },
    { day: "Wed", revenue: 5600, bookings: 4 },
    { day: "Thu", revenue: 7200, bookings: 6 },
    { day: "Fri", revenue: 8900, bookings: 7 },
    { day: "Sat", revenue: 10400, bookings: 8 },
    { day: "Sun", revenue: 8500, bookings: 6 },
  ];

  const maxRevenue = Math.max(...dailyData.map((d) => d.revenue));

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
              Business performance insights for your hotel
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
              <i className="fas fa-arrow-up mr-1"></i> +12% from last period
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="text-xs text-green-600 font-medium">Check-ins</div>
            <div className="text-2xl font-bold text-[#0f1b2d]">
              {currentStats.checkins}
            </div>
            <div className="text-[10px] text-green-500 mt-1">
              <i className="fas fa-users mr-1"></i> {currentStats.bookings}{" "}
              total bookings
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
            <span className="text-xs text-[#8a8278]">Last 7 days</span>
          </div>

          <div className="flex items-end gap-2 h-48">
            {dailyData.map((day, index) => {
              const height = (day.revenue / maxRevenue) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center">
                    <div className="text-[10px] font-bold text-[#0f1b2d]">
                      ₱{day.revenue}
                    </div>
                    <div
                      className="w-full bg-[#c9a84c] rounded-t transition-all duration-500 hover:bg-[#b8963a] cursor-pointer"
                      style={{
                        height: `${Math.max(height, 10)}%`,
                        minHeight: "10px",
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
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Room Type Popularity */}
          <div className="bg-white border border-[#e5e2db] rounded-xl p-4">
            <h3 className="font-semibold text-[#0f1b2d] text-sm mb-3">
              <i className="fas fa-bed mr-2 text-[#c9a84c]"></i>
              Room Type Popularity
            </h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs">
                  <span>Single Bed</span>
                  <span className="font-medium">45%</span>
                </div>
                <div className="h-1.5 bg-[#f7f3ee] rounded-full mt-1">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: "45%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span>Double Bed</span>
                  <span className="font-medium">35%</span>
                </div>
                <div className="h-1.5 bg-[#f7f3ee] rounded-full mt-1">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: "35%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <span>Family Room</span>
                  <span className="font-medium">20%</span>
                </div>
                <div className="h-1.5 bg-[#f7f3ee] rounded-full mt-1">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: "20%" }}></div>
                </div>
              </div>
            </div>
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
              <div className="text-[10px] text-[#8a8278]">Bookings</div>
              <div className="text-lg font-bold text-[#0f1b2d]">
                {currentStats.bookings}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#8a8278]">Check-ins</div>
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
