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
  const printRef = useRef(null);

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

  // Split data into pages for printing (max 25 rows per page)
  const getPageData = (data, rowsPerPage = 25) => {
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

        <div className="p-4 print:p-6" ref={printRef}>
          {/* PRINT HEADER - Only visible when printing */}
          <div className="hidden print:block text-center border-b-2 border-gray-300 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-[#0f1b2d]">
              🏨 Night Audit Report
            </h1>
            <p className="text-sm text-gray-600 mt-1">{hotel?.name}</p>
            <p className="text-sm text-gray-600">
              {new Date(dateRange.start).toLocaleDateString()} -{" "}
              {new Date(dateRange.end).toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Generated: {new Date().toLocaleString()}
            </p>
          </div>

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

          {/* Summary Cards - Visible on screen AND print */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:grid-cols-4 print:gap-4 print:mb-8">
            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center print:border print:border-gray-300 print:shadow-none">
              <div className="text-2xl font-bold text-[#0f1b2d] print:text-xl">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-xs text-[#8a8278] print:text-gray-600">
                Total Revenue
              </div>
              <div className="text-[10px] text-[#8a8278]/50 print:text-gray-400 mt-0.5">
                {summary.totalBookings} bookings
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center print:border print:border-gray-300 print:shadow-none">
              <div className="text-2xl font-bold text-[#0f1b2d] print:text-xl">
                {summary.totalBookings}
              </div>
              <div className="text-xs text-[#8a8278] print:text-gray-600">
                Total Bookings
              </div>
              <div className="text-[10px] text-[#8a8278]/50 print:text-gray-400 mt-0.5">
                Completed
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center print:border print:border-gray-300 print:shadow-none">
              <div className="text-2xl font-bold text-[#0f1b2d] print:text-xl">
                {summary.totalHours}h
              </div>
              <div className="text-xs text-[#8a8278] print:text-gray-600">
                Total Hours
              </div>
              <div className="text-[10px] text-[#8a8278]/50 print:text-gray-400 mt-0.5">
                Room usage
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center print:border print:border-gray-300 print:shadow-none">
              <div className="text-2xl font-bold text-[#0f1b2d] print:text-xl">
                {summary.averageStay}h
              </div>
              <div className="text-xs text-[#8a8278] print:text-gray-600">
                Avg Stay Duration
              </div>
              <div className="text-[10px] text-[#8a8278]/50 print:text-gray-400 mt-0.5">
                Average
              </div>
            </div>
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

          {/* PRINT VIEW - Paginated with page breaks */}
          <div className="hidden print:block">
            {pages.map((pageData, pageIndex) => (
              <div
                key={pageIndex}
                className={`${pageIndex < pages.length - 1 ? "page-break" : ""}`}>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                  Page {pageIndex + 1} of {pages.length}
                </h4>
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
                  {pageIndex === pages.length - 1 && reports.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td
                          colSpan="3"
                          className="p-2 font-semibold text-right text-xs border border-gray-300">
                          Total:
                        </td>
                        <td className="p-2 font-bold text-xs border border-gray-300">
                          {formatCurrency(summary.totalRevenue)}
                        </td>
                        <td
                          colSpan="3"
                          className="p-2 text-xs border border-gray-300">
                          {summary.totalBookings} bookings •{" "}
                          {summary.totalHours}h total
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                <div className="text-center text-xs text-gray-400 mt-2">
                  {hotel?.name} •{" "}
                  {new Date(dateRange.start).toLocaleDateString()} -{" "}
                  {new Date(dateRange.end).toLocaleDateString()}
                </div>
              </div>
            ))}
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

      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          /* Reset body for print */
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide screen-only elements */
          .no-print {
            display: none !important;
          }

          /* Show print-only elements */
          .print\\:block {
            display: block !important;
          }

          /* Page break styling */
          .page-break {
            page-break-after: always;
            page-break-inside: avoid;
          }

          /* Table styling for print */
          .print\\:table {
            display: table !important;
            width: 100% !important;
          }

          /* Card styling for print */
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }

          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          /* Grid for print */
          .print\\:grid-cols-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 1rem !important;
          }

          .print\\:gap-4 {
            gap: 1rem !important;
          }

          .print\\:mb-8 {
            margin-bottom: 2rem !important;
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

          /* Background colors for print */
          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }

          .print\\:bg-gray-50 {
            background-color: #f9fafb !important;
          }

          /* Max width for print */
          .print\\:max-w-full {
            max-width: 100% !important;
          }

          .print\\:overflow-visible {
            overflow: visible !important;
          }

          /* Print header styling */
          .print\\:block {
            display: block !important;
          }

          .print\\:border-b-2 {
            border-bottom-width: 2px !important;
          }

          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }

          .print\\:pb-4 {
            padding-bottom: 1rem !important;
          }

          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
        }

        /* Screen styles - keep as is */
        .page-break {
          /* Only applies in print */
        }
      `}</style>
    </div>
  );
}
