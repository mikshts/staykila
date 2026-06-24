// src/components/reports/ReportsPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function ReportsPanel({ hotel, onClose }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    totalHours: 0,
    averageStay: 0,
  });
  const panelRef = useRef(null);

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

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms(name)
        `,
        )
        .eq("hotel_id", hotel.id)
        .eq("status", "completed")
        .gte("created_at", new Date(dateRange.start).toISOString())
        .lte("created_at", new Date(dateRange.end + "T23:59:59").toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReports(data || []);

      const totalRevenue =
        data?.reduce((sum, b) => sum + (b.price || 0), 0) || 0;
      const totalBookings = data?.length || 0;
      const totalHours = data?.reduce((sum, b) => sum + (b.hours || 0), 0) || 0;
      const averageStay =
        totalBookings > 0 ? Math.round(totalHours / totalBookings) : 0;

      setSummary({
        totalRevenue,
        totalBookings,
        totalHours,
        averageStay,
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
    if (reports.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Date",
      "Room",
      "Hours",
      "Price",
      "Guest Name",
      "Check-in",
      "Check-out",
    ];
    const rows = reports.map((b) => [
      new Date(b.created_at).toLocaleDateString(),
      b.rooms?.name || "Unknown",
      b.hours,
      b.price,
      b.guest_name || "N/A",
      new Date(b.start_time).toLocaleTimeString(),
      new Date(b.end_time).toLocaleTimeString(),
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

  // Split data into pages for printing (max 18 rows per page for better fit)
  const getPageData = (data, rowsPerPage = 18) => {
    const pages = [];
    for (let i = 0; i < data.length; i += rowsPerPage) {
      pages.push(data.slice(i, i + rowsPerPage));
    }
    return pages;
  };

  const pages = getPageData(reports);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-4xl h-full overflow-y-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f1b2d]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-4xl h-full overflow-y-auto print:max-w-full print:overflow-visible print:bg-white">
        {/* Header - Screen */}
        <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between print:hidden">
          <div>
            <div className="font-bold text-lg">Night Audit Reports</div>
            <div className="text-xs text-white/50">
              {hotel?.name} • {new Date().toLocaleDateString()}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4 print:p-6">
          {/* Date Range Selector - Screen only */}
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-6 no-print">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#8a8278] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8a8278] mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none bg-white"
                />
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={fetchReports}
                  className="px-4 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <i className="fas fa-search mr-1"></i> Refresh
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#c9a84c] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <i className="fas fa-print mr-1"></i> Print
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
                  <i className="fas fa-file-export mr-1"></i> Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* PRINT VIEW - Professional Layout */}
          <div className="hidden print:block">
            {pages.map((pageData, pageIndex) => {
              const pageTotalRevenue = pageData.reduce(
                (sum, b) => sum + (b.price || 0),
                0,
              );
              const pageTotalBookings = pageData.length;
              const pageTotalHours = pageData.reduce(
                (sum, b) => sum + (b.hours || 0),
                0,
              );
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === pages.length - 1;

              return (
                <div
                  key={pageIndex}
                  className={`${!isLastPage ? "page-break" : ""}`}>
                  {/* ===== FIRST PAGE: Full Header with Logo & Summary ===== */}
                  {isFirstPage && (
                    <>
                      {/* Header with Logo - Blue & Gold */}
                      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white p-5 rounded-t-lg flex items-center justify-between border-b-4 border-[#c9a84c]">
                        <div className="flex items-center gap-4">
                          <img
                            src="/favicon1.png"
                            alt="StayKila"
                            className="w-12 h-12 rounded-lg border-2 border-[#c9a84c]"
                          />
                          <div>
                            <h1 className="text-2xl font-bold">
                              Stay<span className="text-[#c9a84c]">Kila</span>
                            </h1>
                            <p className="text-sm text-white/70">
                              Night Audit Report
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{hotel?.name}</p>
                          <p className="text-xs text-white/60">
                            {new Date(dateRange.start).toLocaleDateString()} -{" "}
                            {new Date(dateRange.end).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 text-right px-2 py-1 bg-gray-50 border-x border-b border-gray-200 rounded-b-lg">
                        Generated: {new Date().toLocaleString()}
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-4 gap-3 my-4">
                        <div className="border border-gray-300 rounded-lg p-3 text-center bg-gray-50">
                          <div className="text-lg font-bold text-[#0f1b2d]">
                            {formatCurrency(summary.totalRevenue)}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            Total Revenue
                          </div>
                          <div className="text-[9px] text-gray-400">
                            {summary.totalBookings} bookings
                          </div>
                        </div>
                        <div className="border border-gray-300 rounded-lg p-3 text-center bg-gray-50">
                          <div className="text-lg font-bold text-[#0f1b2d]">
                            {summary.totalBookings}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            Total Bookings
                          </div>
                          <div className="text-[9px] text-gray-400">
                            Completed
                          </div>
                        </div>
                        <div className="border border-gray-300 rounded-lg p-3 text-center bg-gray-50">
                          <div className="text-lg font-bold text-[#0f1b2d]">
                            {summary.totalHours}h
                          </div>
                          <div className="text-[10px] text-gray-600">
                            Total Hours
                          </div>
                          <div className="text-[9px] text-gray-400">
                            Room usage
                          </div>
                        </div>
                        <div className="border border-gray-300 rounded-lg p-3 text-center bg-gray-50">
                          <div className="text-lg font-bold text-[#0f1b2d]">
                            {summary.averageStay}h
                          </div>
                          <div className="text-[10px] text-gray-600">
                            Avg Stay Duration
                          </div>
                          <div className="text-[9px] text-gray-400">
                            Average
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ===== SUBSEQUENT PAGES: Clean header with page number only ===== */}
                  {!isFirstPage && (
                    <div className="text-center border-b border-gray-300 pb-2 mb-3">
                      <span className="text-sm font-semibold text-gray-600">
                        Night Audit Report - Page {pageIndex + 1} of{" "}
                        {pages.length}
                      </span>
                    </div>
                  )}

                  {/* ===== TRANSACTION TABLE ===== */}
                  <table className="w-full text-sm border-collapse">
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
                          Check-in
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700 text-xs border border-gray-300">
                          Checkout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.map((booking) => (
                        <tr key={booking.id} className="border border-gray-200">
                          <td className="p-2 text-xs border border-gray-200">
                            {new Date(booking.created_at).toLocaleDateString()}
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
                            {new Date(booking.start_time).toLocaleTimeString()}
                          </td>
                          <td className="p-2 text-xs border border-gray-200">
                            {new Date(booking.end_time).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      {/* Page Total */}
                      <tr className="bg-gray-50 font-semibold">
                        <td
                          colSpan="3"
                          className="p-2 text-right text-xs border border-gray-300">
                          Page Total:
                        </td>
                        <td className="p-2 text-xs border border-gray-300 text-[#c9a84c] font-bold">
                          {formatCurrency(pageTotalRevenue)}
                        </td>
                        <td
                          colSpan="3"
                          className="p-2 text-xs border border-gray-300">
                          {pageTotalBookings} bookings • {pageTotalHours}h
                        </td>
                      </tr>

                      {/* Grand Total - Only on last page */}
                      {isLastPage && reports.length > 0 && (
                        <tr className="bg-blue-50 font-bold">
                          <td
                            colSpan="3"
                            className="p-2 text-right text-xs border border-blue-300">
                            GRAND TOTAL:
                          </td>
                          <td className="p-2 text-xs border border-blue-300 text-[#c9a84c] font-bold">
                            {formatCurrency(summary.totalRevenue)}
                          </td>
                          <td
                            colSpan="3"
                            className="p-2 text-xs border border-blue-300">
                            {summary.totalBookings} bookings •{" "}
                            {summary.totalHours}h total
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>

                  {/* Footer */}
                  <div className="text-center text-xs text-gray-400 mt-2 pt-1 border-t border-gray-200">
                    {hotel?.name} •{" "}
                    {new Date(dateRange.start).toLocaleDateString()} -{" "}
                    {new Date(dateRange.end).toLocaleDateString()}
                    {!isFirstPage &&
                      ` • Page ${pageIndex + 1} of ${pages.length}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Report Table - Screen View */}
          <div className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden print:hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#fafafa] border-b border-[#e5e2db]">
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Room
                    </th>
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Check-in
                    </th>
                    <th className="text-left p-3 font-semibold text-[#8a8278] text-xs uppercase tracking-wider">
                      Checkout
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-8 text-[#8a8278]">
                        No completed bookings found for this period
                      </td>
                    </tr>
                  ) : (
                    reports.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-b border-[#e5e2db] hover:bg-[#f7f3ee] transition">
                        <td className="p-3">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-medium">
                          {booking.rooms?.name || "Unknown"}
                        </td>
                        <td className="p-3">{booking.hours}h</td>
                        <td className="p-3 font-medium text-[#c9a84c]">
                          ₱{booking.price}
                        </td>
                        <td className="p-3">{booking.guest_name || "N/A"}</td>
                        <td className="p-3 text-xs">
                          {new Date(booking.start_time).toLocaleTimeString()}
                        </td>
                        <td className="p-3 text-xs">
                          {new Date(booking.end_time).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reports.length > 0 && (
                  <tfoot className="bg-[#fafafa] border-t border-[#e5e2db]">
                    <tr>
                      <td colSpan="3" className="p-3 font-semibold text-right">
                        Total:
                      </td>
                      <td className="p-3 font-bold text-[#c9a84c]">
                        {formatCurrency(summary.totalRevenue)}
                      </td>
                      <td colSpan="3" className="p-3">
                        {summary.totalBookings} bookings • {summary.totalHours}h
                        total
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Footer - Screen only */}
          <div className="mt-4 text-xs text-[#8a8278] text-center no-print">
            <p>Generated on {new Date().toLocaleString()}</p>
            <p className="mt-1">
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
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .no-print {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }

          .page-break {
            page-break-after: always;
            page-break-inside: avoid;
          }

          .print\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 1rem !important;
          }

          .print\\:gap-3 {
            gap: 0.75rem !important;
          }

          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }

          .print\\:p-6 {
            padding: 1.5rem !important;
          }

          .print\\:text-xl {
            font-size: 1.25rem !important;
          }

          .print\\:text-gray-600 {
            color: #4b5563 !important;
          }

          .print\\:text-gray-400 {
            color: #9ca3af !important;
          }

          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }

          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }

          .print\\:bg-blue-50 {
            background-color: #eff6ff !important;
          }

          .print\\:max-w-full {
            max-width: 100% !important;
          }

          .print\\:overflow-visible {
            overflow: visible !important;
          }

          .print\\:border {
            border: 1px solid #d1d5db !important;
          }

          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }

          .print\\:border-blue-300 {
            border-color: #93c5fd !important;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:mt-2 {
            margin-top: 0.5rem !important;
          }

          .print\\:pt-1 {
            padding-top: 0.25rem !important;
          }

          .print\\:my-4 {
            margin-top: 1rem !important;
            margin-bottom: 1rem !important;
          }

          .print\\:rounded-lg {
            border-radius: 0.5rem !important;
          }

          .print\\:rounded-t-lg {
            border-top-left-radius: 0.5rem !important;
            border-top-right-radius: 0.5rem !important;
          }

          .print\\:rounded-b-lg {
            border-bottom-left-radius: 0.5rem !important;
            border-bottom-right-radius: 0.5rem !important;
          }

          .print\\:border-b-4 {
            border-bottom-width: 4px !important;
          }

          .print\\:border-b {
            border-bottom-width: 1px !important;
          }

          .print\\:border-t {
            border-top-width: 1px !important;
          }

          .print\\:border-x {
            border-left-width: 1px !important;
            border-right-width: 1px !important;
          }

          .print\\:text-right {
            text-align: right !important;
          }

          .print\\:text-center {
            text-align: center !important;
          }

          .print\\:p-5 {
            padding: 1.25rem !important;
          }

          .print\\:p-3 {
            padding: 0.75rem !important;
          }

          .print\\:p-2 {
            padding: 0.5rem !important;
          }

          .print\\:px-2 {
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
          }

          .print\\:py-1 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }

          .print\\:pb-2 {
            padding-bottom: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
