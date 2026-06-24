// src/components/reports/ReportsPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function ReportsPanel({ hotel, onClose }) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalHours: 0,
    averageStay: 0,
    cashRevenue: 0,
    otaRevenue: 0,
    walkInRevenue: 0,
    maintenanceRevenue: 0,
    totalCheckins: 0,
    totalCheckouts: 0,
    revenueBySource: {},
    revenueByDuration: {},
  });
  const [period, setPeriod] = useState("today");
  const [showDetailed, setShowDetailed] = useState(true);
  const panelRef = useRef(null);
  const printRef = useRef(null);

  // Quick period presets
  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case "week":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        end = new Date(now);
        break;
      case "month":
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        end = new Date(now);
        break;
      default:
        break;
    }

    setDateRange({
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    });
  }, [period]);

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

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const { data: completedBookings, error: completedError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms(name, room_number)
        `,
        )
        .eq("hotel_id", hotel.id)
        .eq("status", "completed")
        .gte("created_at", new Date(dateRange.start).toISOString())
        .lte("created_at", new Date(dateRange.end + "T23:59:59").toISOString())
        .order("created_at", { ascending: false });

      if (completedError) throw completedError;

      const { data: activeBookings, error: activeError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms(name, room_number)
        `,
        )
        .eq("hotel_id", hotel.id)
        .eq("status", "active");

      if (activeError)
        console.error("Error fetching active bookings:", activeError);

      const { data: cancelledBookings, error: cancelledError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms(name, room_number)
        `,
        )
        .eq("hotel_id", hotel.id)
        .eq("status", "cancelled")
        .gte("created_at", new Date(dateRange.start).toISOString())
        .lte("created_at", new Date(dateRange.end + "T23:59:59").toISOString());

      if (cancelledError)
        console.error("Error fetching cancelled bookings:", cancelledError);

      const totalRevenue =
        completedBookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
      const totalBookings = completedBookings?.length || 0;
      const totalHours =
        completedBookings?.reduce((sum, b) => sum + (b.hours || 0), 0) || 0;
      const averageStay =
        totalBookings > 0 ? Math.round(totalHours / totalBookings) : 0;

      const revenueBySource = {};
      const revenueByDuration = {};
      let cashRevenue = 0;
      let otaRevenue = 0;
      let walkInRevenue = 0;
      let maintenanceRevenue = 0;

      completedBookings?.forEach((b) => {
        const source = b.booking_source || "walk-in";
        const durationKey = `${b.hours}h`;

        revenueBySource[source] =
          (revenueBySource[source] || 0) + (b.price || 0);
        revenueByDuration[durationKey] =
          (revenueByDuration[durationKey] || 0) + (b.price || 0);

        switch (source) {
          case "agoda":
          case "booking":
            otaRevenue += b.price || 0;
            break;
          case "walk-in":
            walkInRevenue += b.price || 0;
            break;
          case "maintenance":
            maintenanceRevenue += b.price || 0;
            break;
          default:
            cashRevenue += b.price || 0;
        }
      });

      const totalCheckins =
        completedBookings?.filter((b) => b.checked_in_at).length || 0;
      const totalCheckouts =
        completedBookings?.filter((b) => b.checked_out_at).length || 0;

      const todayActive =
        activeBookings?.filter(
          (b) =>
            new Date(b.start_time).toDateString() === new Date().toDateString(),
        ).length || 0;

      setSummary({
        totalRevenue,
        totalBookings,
        totalHours,
        averageStay,
        cashRevenue,
        otaRevenue,
        walkInRevenue,
        maintenanceRevenue,
        totalCheckins,
        totalCheckouts,
        revenueBySource,
        revenueByDuration,
        todayActive,
        cancelledCount: cancelledBookings?.length || 0,
      });

      setReports({
        completed: completedBookings || [],
        active: activeBookings || [],
        cancelled: cancelledBookings || [],
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const data = reports.completed || [];
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Time",
      "Room",
      "Room #",
      "Hours",
      "Price",
      "Guest Name",
      "Source",
      "Check-in",
      "Check-out",
    ];
    const rows = data.map((b) => [
      new Date(b.created_at).toLocaleDateString(),
      new Date(b.created_at).toLocaleTimeString(),
      b.rooms?.name || "Unknown",
      b.rooms?.room_number || "N/A",
      b.hours,
      b.price,
      b.guest_name || "N/A",
      b.booking_source || "walk-in",
      b.checked_in_at ? new Date(b.checked_in_at).toLocaleTimeString() : "N/A",
      b.checked_out_at
        ? new Date(b.checked_out_at).toLocaleTimeString()
        : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Night_Audit_Report_${dateRange.start}_to_${dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSourceLabel = (source) => {
    const labels = {
      agoda: "🏨 Agoda",
      booking: "🛏️ Booking.com",
      "walk-in": "🚶 Walk-in",
      maintenance: "🔧 Maintenance",
      other: "📋 Other",
    };
    return labels[source] || source || "🚶 Walk-in";
  };

  // Split data into pages for printing (max 20 rows per page)
  const getPageData = (data, rowsPerPage = 20) => {
    const pages = [];
    for (let i = 0; i < data.length; i += rowsPerPage) {
      pages.push(data.slice(i, i + rowsPerPage));
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-5xl h-full overflow-y-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f1b2d]"></div>
        </div>
      </div>
    );
  }

  const reportData = reports.completed || [];
  const sourceKeys = Object.keys(summary.revenueBySource);
  const durationKeys = Object.keys(summary.revenueByDuration);
  const pages = getPageData(reportData);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-5xl h-full overflow-y-auto print:max-w-full print:bg-white print:overflow-visible">
        {/* Header - Screen only */}
        <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between z-10 print:hidden">
          <div>
            <div className="font-bold text-lg flex items-center gap-2">
              <i className="fas fa-file-invoice text-[#c9a84c]"></i>
              Night Audit Report
            </div>
            <div className="text-xs text-white/50">
              {hotel?.name} •{" "}
              {new Date().toLocaleDateString("en-PH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4 print:p-6" ref={printRef}>
          {/* PRINT HEADER - Visible only when printing */}
          <div className="hidden print:block text-center border-b border-gray-300 pb-4 mb-4">
            <h1 className="text-2xl font-bold text-[#0f1b2d]">
              🏨 Night Audit Report
            </h1>
            <p className="text-sm text-gray-600">{hotel?.name}</p>
            <p className="text-sm text-gray-600">
              {new Date(dateRange.start).toLocaleDateString()} to{" "}
              {new Date(dateRange.end).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>

          {/* Period Selector - Screen only */}
          <div className="no-print bg-[#f7f3ee] rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {[
                  { id: "today", label: "Today" },
                  { id: "yesterday", label: "Yesterday" },
                  { id: "week", label: "7 Days" },
                  { id: "month", label: "30 Days" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriod(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      period === p.id
                        ? "bg-[#0f1b2d] text-white"
                        : "bg-white text-[#8a8278] border border-[#e5e2db] hover:border-[#0f1b2d]"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="px-3 py-1.5 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none bg-white"
                />
                <span className="text-[#8a8278] text-xs">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="px-3 py-1.5 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none bg-white"
                />
                <button
                  onClick={fetchReports}
                  className="px-4 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <i className="fas fa-search mr-1"></i> Refresh
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <i className="fas fa-print mr-1"></i> Print
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <i className="fas fa-file-export mr-1"></i> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:grid-cols-4 print:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 print:bg-gray-100 print:border print:border-gray-300">
              <div className="text-xs text-blue-600 print:text-gray-700 font-medium">
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-[10px] text-blue-500 print:text-gray-600 mt-1">
                {summary.totalBookings} bookings
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 print:bg-gray-100 print:border print:border-gray-300">
              <div className="text-xs text-green-600 print:text-gray-700 font-medium">
                Active Check-ins
              </div>
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {summary.todayActive || 0}
              </div>
              <div className="text-[10px] text-green-500 print:text-gray-600 mt-1">
                Currently staying
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 print:bg-gray-100 print:border print:border-gray-300">
              <div className="text-xs text-purple-600 print:text-gray-700 font-medium">
                Avg Stay
              </div>
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {summary.averageStay}h
              </div>
              <div className="text-[10px] text-purple-500 print:text-gray-600 mt-1">
                Average duration
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 print:bg-gray-100 print:border print:border-gray-300">
              <div className="text-xs text-amber-600 print:text-gray-700 font-medium">
                Total Hours
              </div>
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {summary.totalHours}h
              </div>
              <div className="text-[10px] text-amber-500 print:text-gray-600 mt-1">
                Room usage total
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:grid-cols-2 print:gap-6">
            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 print:border print:border-gray-300">
              <h3 className="font-semibold text-[#0f1b2d] text-sm mb-3 flex items-center gap-2">
                <i className="fas fa-chart-pie text-[#c9a84c]"></i>
                Revenue by Source
              </h3>
              {sourceKeys.length === 0 ? (
                <p className="text-xs text-[#8a8278] text-center py-4">
                  No data
                </p>
              ) : (
                <div className="space-y-2">
                  {sourceKeys.map((source) => {
                    const revenue = summary.revenueBySource[source];
                    const percentage =
                      summary.totalRevenue > 0
                        ? Math.round((revenue / summary.totalRevenue) * 100)
                        : 0;
                    const colors = {
                      agoda: "bg-blue-500",
                      booking: "bg-indigo-500",
                      "walk-in": "bg-green-500",
                      maintenance: "bg-orange-500",
                      other: "bg-gray-500",
                    };
                    const color = colors[source] || "bg-gray-400";

                    return (
                      <div key={source}>
                        <div className="flex justify-between text-xs">
                          <span>{getSourceLabel(source)}</span>
                          <span className="font-medium">
                            {formatCurrency(revenue)} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#f7f3ee] rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-[#e5e2db] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#8a8278]">OTA Revenue:</span>{" "}
                  <span className="font-medium ml-1">
                    {formatCurrency(summary.otaRevenue)}
                  </span>
                </div>
                <div>
                  <span className="text-[#8a8278]">Walk-in Revenue:</span>{" "}
                  <span className="font-medium ml-1">
                    {formatCurrency(summary.walkInRevenue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 print:border print:border-gray-300">
              <h3 className="font-semibold text-[#0f1b2d] text-sm mb-3 flex items-center gap-2">
                <i className="fas fa-clock text-[#c9a84c]"></i>
                Revenue by Duration
              </h3>
              {durationKeys.length === 0 ? (
                <p className="text-xs text-[#8a8278] text-center py-4">
                  No data
                </p>
              ) : (
                <div className="space-y-2">
                  {durationKeys
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .map((duration) => {
                      const revenue = summary.revenueByDuration[duration];
                      const percentage =
                        summary.totalRevenue > 0
                          ? Math.round((revenue / summary.totalRevenue) * 100)
                          : 0;
                      const colors = [
                        "#3b82f6",
                        "#8b5cf6",
                        "#f59e0b",
                        "#10b981",
                        "#ef4444",
                      ];
                      const idx =
                        parseInt(duration) === 1
                          ? 0
                          : parseInt(duration) === 3
                            ? 1
                            : parseInt(duration) === 6
                              ? 2
                              : parseInt(duration) === 12
                                ? 3
                                : 4;

                      return (
                        <div key={duration}>
                          <div className="flex justify-between text-xs">
                            <span>{duration}</span>
                            <span className="font-medium">
                              {formatCurrency(revenue)} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#f7f3ee] rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: colors[idx % colors.length],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-6 print:grid-cols-5 print:gap-3">
            <div className="bg-[#f7f3ee] rounded-lg p-3 text-center print:bg-gray-100">
              <div className="text-lg font-bold text-[#0f1b2d]">
                {summary.totalCheckins}
              </div>
              <div className="text-[9px] text-[#8a8278]">Check-ins</div>
            </div>
            <div className="bg-[#f7f3ee] rounded-lg p-3 text-center print:bg-gray-100">
              <div className="text-lg font-bold text-[#0f1b2d]">
                {summary.totalCheckouts}
              </div>
              <div className="text-[9px] text-[#8a8278]">Check-outs</div>
            </div>
            <div className="bg-[#f7f3ee] rounded-lg p-3 text-center print:bg-gray-100">
              <div className="text-lg font-bold text-[#0f1b2d]">
                {summary.cancelledCount || 0}
              </div>
              <div className="text-[9px] text-[#8a8278]">Cancellations</div>
            </div>
            <div className="bg-[#f7f3ee] rounded-lg p-3 text-center print:bg-gray-100">
              <div className="text-lg font-bold text-[#0f1b2d]">
                {summary.totalBookings}
              </div>
              <div className="text-[9px] text-[#8a8278]">Completed</div>
            </div>
            <div className="bg-[#f7f3ee] rounded-lg p-3 text-center print:bg-gray-100">
              <div className="text-lg font-bold text-[#0f1b2d]">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-[9px] text-[#8a8278]">Total Revenue</div>
            </div>
          </div>

          {/* Transaction Details - Print optimized with pagination */}
          <div className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden print:border print:border-gray-300 print:overflow-visible">
            <div className="flex justify-between items-center p-3 border-b border-[#e5e2db] print:bg-gray-100">
              <h3 className="font-semibold text-[#0f1b2d] text-sm flex items-center gap-2">
                <i className="fas fa-list-ul text-[#c9a84c]"></i>
                Transaction Details
                <span className="text-xs text-[#8a8278] font-normal">
                  ({reportData.length} records)
                </span>
              </h3>
              <button
                onClick={() => setShowDetailed(!showDetailed)}
                className="no-print text-xs text-[#8a8278] hover:text-[#0f1b2d]">
                <i
                  className={`fas fa-chevron-${showDetailed ? "up" : "down"} mr-1`}></i>
                {showDetailed ? "Collapse" : "Expand"}
              </button>
            </div>

            {showDetailed && (
              <div className="overflow-x-auto print:overflow-visible">
                {/* Screen Table */}
                <table className="w-full text-sm print:table print:w-full">
                  <thead className="print:bg-gray-100">
                    <tr className="bg-[#fafafa] border-b border-[#e5e2db] print:border print:border-gray-300">
                      <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                        Room
                      </th>
                      <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                        Price
                      </th>
                      <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                        Guest
                      </th>
                      <th className="text-left p-2 font-semibold text-[#8a8278] text-[10px] uppercase tracking-wider">
                        Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-8 text-[#8a8278]">
                          <i className="fas fa-inbox text-2xl block mb-2 opacity-40"></i>
                          No completed bookings found
                        </td>
                      </tr>
                    ) : (
                      // Render all rows for screen, but they will auto-paginate on print
                      reportData.map((booking) => (
                        <tr
                          key={booking.id}
                          className="border-b border-[#e5e2db] hover:bg-[#f7f3ee] transition print:hover:bg-transparent">
                          <td className="p-2 text-xs">
                            {new Date(booking.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2 font-medium text-xs">
                            {booking.rooms?.name || "Unknown"}
                          </td>
                          <td className="p-2 text-xs">{booking.hours}h</td>
                          <td className="p-2 font-medium text-[#c9a84c] text-xs">
                            ₱{booking.price}
                          </td>
                          <td className="p-2 text-xs">
                            {booking.guest_name || "N/A"}
                          </td>
                          <td className="p-2 text-xs">
                            {getSourceLabel(booking.booking_source)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {reportData.length > 0 && (
                    <tfoot className="bg-[#fafafa] border-t border-[#e5e2db] print:bg-gray-100">
                      <tr>
                        <td
                          colSpan="3"
                          className="p-2 font-semibold text-right text-xs">
                          Total:
                        </td>
                        <td className="p-2 font-bold text-[#c9a84c] text-xs">
                          {formatCurrency(summary.totalRevenue)}
                        </td>
                        <td colSpan="2" className="p-2 text-xs">
                          {summary.totalBookings} bookings •{" "}
                          {summary.totalHours}h total
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Print Pagination - Only visible when printing */}
                <div className="hidden print:block mt-8">
                  {pages.map((pageData, pageIndex) => (
                    <div key={pageIndex} className="page-break">
                      <table className="w-full text-sm mt-4">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                              Date
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                              Room
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                              Hours
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                              Price
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                              Guest
                            </th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                              Source
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageData.map((booking) => (
                            <tr
                              key={booking.id}
                              className="border border-gray-200">
                              <td className="p-2 text-xs border border-gray-200">
                                {new Date(
                                  booking.created_at,
                                ).toLocaleDateString()}
                              </td>
                              <td className="p-2 font-medium text-xs border border-gray-200">
                                {booking.rooms?.name || "Unknown"}
                              </td>
                              <td className="p-2 text-xs border border-gray-200">
                                {booking.hours}h
                              </td>
                              <td className="p-2 font-medium text-xs border border-gray-200">
                                ₱{booking.price}
                              </td>
                              <td className="p-2 text-xs border border-gray-200">
                                {booking.guest_name || "N/A"}
                              </td>
                              <td className="p-2 text-xs border border-gray-200">
                                {getSourceLabel(booking.booking_source)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        {pageIndex === pages.length - 1 && (
                          <tfoot>
                            <tr>
                              <td
                                colSpan="3"
                                className="p-2 font-semibold text-right text-xs border border-gray-200">
                                Total:
                              </td>
                              <td className="p-2 font-bold text-xs border border-gray-200">
                                {formatCurrency(summary.totalRevenue)}
                              </td>
                              <td
                                colSpan="2"
                                className="p-2 text-xs border border-gray-200">
                                {summary.totalBookings} bookings •{" "}
                                {summary.totalHours}h total
                              </td>
                            </tr>
                          </tfoot>
                        )}
                        <tr>
                          <td
                            colSpan="6"
                            className="text-center text-xs text-gray-500 pt-2">
                            Page {pageIndex + 1} of {pages.length}
                          </td>
                        </tr>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 text-xs text-[#8a8278] text-center border-t border-[#e5e2db] pt-4 print:border-t print:border-gray-300 print:mt-8 print:pt-4">
            <p>
              <i className="fas fa-calendar-alt mr-1"></i>
              Report: {dateRange.start} to {dateRange.end}
            </p>
            <p className="mt-1">
              <i className="fas fa-clock mr-1"></i>
              Generated: {new Date().toLocaleString()}
            </p>
            <p className="mt-1 no-print">
              <i className="fas fa-print mr-1"></i> Click Print for PDF •
              <i className="fas fa-file-export ml-2 mr-1"></i> Click Export CSV
              for spreadsheet
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:p-6 {
            padding: 1.5rem !important;
          }
          .print\\:mt-8 {
            margin-top: 2rem !important;
          }
          .print\\:pt-4 {
            padding-top: 1rem !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          .print\\:w-full {
            width: 100% !important;
          }
          .print\\:table {
            display: table !important;
          }
          .print\\:grid-cols-4 {
            grid-template-columns: repeat(4, 1fr) !important;
          }
          .print\\:grid-cols-5 {
            grid-template-columns: repeat(5, 1fr) !important;
          }
          .print\\:grid-cols-2 {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .print\\:gap-4 {
            gap: 1rem !important;
          }
          .print\\:gap-6 {
            gap: 1.5rem !important;
          }
          .print\\:gap-3 {
            gap: 0.75rem !important;
          }
          .print\\:bg-white {
            background-color: white !important;
          }
          .print\\:text-black {
            color: black !important;
          }
          .print\\:text-gray-700 {
            color: #374151 !important;
          }
          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:max-w-full {
            max-width: 100% !important;
          }
          .print\\:overflow-visible {
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
