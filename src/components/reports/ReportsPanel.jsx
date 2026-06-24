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

  // Split data into pages for printing (max 18 rows per page)
  const getPageData = (data, rowsPerPage = 18) => {
    const pages = [];
    // Always return at least one (possibly empty) page so the print
    // view has somewhere to show "no bookings" / the summary cards.
    if (data.length === 0) return [[]];
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end print:static print:bg-white print:block">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-4xl h-full overflow-y-auto print:max-w-full print:overflow-visible print:bg-white print:h-auto print:w-auto">
        {/* ============================================================ */}
        {/* SCREEN-ONLY CONTENT (everything below is print:hidden)        */}
        {/* ============================================================ */}

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

        <div className="p-4 print:hidden">
          {/* Date Range Selector - Screen only */}
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-6">
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

          {/* Summary Cards - SCREEN ONLY (this whole block never prints) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="text-xs text-[#8a8278]">Total Revenue</div>
              <div className="text-[10px] text-[#8a8278]/50 mt-0.5">
                {summary.totalBookings} bookings
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {summary.totalBookings}
              </div>
              <div className="text-xs text-[#8a8278]">Total Bookings</div>
              <div className="text-[10px] text-[#8a8278]/50 mt-0.5">
                Completed
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {summary.totalHours}h
              </div>
              <div className="text-xs text-[#8a8278]">Total Hours</div>
              <div className="text-[10px] text-[#8a8278]/50 mt-0.5">
                Room usage
              </div>
            </div>

            <div className="bg-white border border-[#e5e2db] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#0f1b2d]">
                {summary.averageStay}h
              </div>
              <div className="text-xs text-[#8a8278]">Avg Stay Duration</div>
              <div className="text-[10px] text-[#8a8278]/50 mt-0.5">
                Average
              </div>
            </div>
          </div>

          {/* Report Table - Screen View only */}
          <div className="bg-white border border-[#e5e2db] rounded-xl overflow-hidden">
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
          <div className="mt-4 text-xs text-[#8a8278] text-center">
            <p>Generated on {new Date().toLocaleString()}</p>
            <p className="mt-1">
              <i className="fas fa-print mr-1"></i> Click Print for PDF •
              <i className="fas fa-file-export ml-2 mr-1"></i> Click Export CSV
              for spreadsheet
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRINT-ONLY CONTENT — the ONLY thing visible when printing.     */}
        {/* This is the single source of truth for the printed report.    */}
        {/* Nothing above this point renders on print (all print:hidden). */}
        {/* ============================================================ */}
        <div className="hidden print:block print-report">
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
                className={
                  "print-page" + (!isLastPage ? " print-page-break" : "")
                }>
                {/* Header with Logo - ONLY on first page */}
                {isFirstPage && (
                  <div className="print-header-main">
                    <div className="print-header-left">
                      <img
                        src="/favicon1.png"
                        alt="StayKila"
                        className="print-logo"
                      />
                      <div>
                        <h1 className="print-brand">
                          Stay<span className="print-brand-gold">Kila</span>
                        </h1>
                        <p className="print-subtitle">Night Audit Report</p>
                      </div>
                    </div>
                    <div className="print-header-right">
                      <p className="print-hotel-name">{hotel?.name}</p>
                      <p className="print-date-range">
                        {new Date(dateRange.start).toLocaleDateString()} -{" "}
                        {new Date(dateRange.end).toLocaleDateString()}
                      </p>
                      <p className="print-generated">
                        Generated: {new Date().toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Simple header - ONLY on pages after the first */}
                {!isFirstPage && (
                  <div className="print-header-simple">
                    Night Audit Report - Page {pageIndex + 1} of {pages.length}
                  </div>
                )}

                {/* Summary Cards - ONLY on first page */}
                {isFirstPage && (
                  <div className="print-summary-grid">
                    <div className="print-summary-card">
                      <div className="print-summary-value">
                        {formatCurrency(summary.totalRevenue)}
                      </div>
                      <div className="print-summary-label">Total Revenue</div>
                      <div className="print-summary-sub">
                        {summary.totalBookings} bookings
                      </div>
                    </div>
                    <div className="print-summary-card">
                      <div className="print-summary-value">
                        {summary.totalBookings}
                      </div>
                      <div className="print-summary-label">Total Bookings</div>
                      <div className="print-summary-sub">Completed</div>
                    </div>
                    <div className="print-summary-card">
                      <div className="print-summary-value">
                        {summary.totalHours}h
                      </div>
                      <div className="print-summary-label">Total Hours</div>
                      <div className="print-summary-sub">Room usage</div>
                    </div>
                    <div className="print-summary-card">
                      <div className="print-summary-value">
                        {summary.averageStay}h
                      </div>
                      <div className="print-summary-label">
                        Avg Stay Duration
                      </div>
                      <div className="print-summary-sub">Average</div>
                    </div>
                  </div>
                )}

                {/* Transaction Table */}
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Room</th>
                      <th>Hours</th>
                      <th>Price</th>
                      <th>Guest</th>
                      <th>Check-in</th>
                      <th>Checkout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="print-no-data">
                          No completed bookings found for this period
                        </td>
                      </tr>
                    ) : (
                      pageData.map((booking) => (
                        <tr key={booking.id}>
                          <td>
                            {new Date(booking.created_at).toLocaleDateString()}
                          </td>
                          <td className="print-cell-strong">
                            {booking.rooms?.name || "Unknown"}
                          </td>
                          <td>{booking.hours}h</td>
                          <td className="print-cell-gold">₱{booking.price}</td>
                          <td>{booking.guest_name || "N/A"}</td>
                          <td>
                            {new Date(booking.start_time).toLocaleTimeString()}
                          </td>
                          <td>
                            {new Date(booking.end_time).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {pageData.length > 0 && (
                    <tfoot>
                      <tr className="print-page-total-row">
                        <td colSpan="3" className="print-total-label">
                          Page Total:
                        </td>
                        <td className="print-cell-gold print-cell-strong">
                          {formatCurrency(pageTotalRevenue)}
                        </td>
                        <td colSpan="3">
                          {pageTotalBookings} bookings • {pageTotalHours}h
                        </td>
                      </tr>
                      {isLastPage && reports.length > 0 && (
                        <tr className="print-grand-total-row">
                          <td colSpan="3" className="print-total-label">
                            GRAND TOTAL:
                          </td>
                          <td className="print-cell-gold print-cell-strong">
                            {formatCurrency(summary.totalRevenue)}
                          </td>
                          <td colSpan="3">
                            {summary.totalBookings} bookings •{" "}
                            {summary.totalHours}h total
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  )}
                </table>

                {/* Footer */}
                <div className="print-footer">
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
      </div>

      {/* ============================================================ */}
      {/* Print Styles                                                  */}
      {/* ============================================================ */}
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 12mm 10mm;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Belt-and-suspenders: hide EVERYTHING by default when printing,
             then explicitly re-show only the print report. This prevents
             any other fixed/sticky/overlay elements in the app (modals,
             toasts, nav bars, etc.) from sneaking onto the printed page
             and causing a second "copy" of content or a blank 2nd sheet. */
          body * {
            visibility: hidden;
          }

          .print-report,
          .print-report * {
            visibility: visible;
          }

          .print-report {
            position: absolute;
            inset: 0;
            width: 100%;
          }

          .print-page {
            width: 100%;
          }

          .print-page-break {
            page-break-after: always;
          }

          /* ----- Header (page 1 only) ----- */
          .print-header-main {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(to right, #1e3a8a, #1e40af);
            color: #ffffff;
            padding: 18px 20px;
            border-radius: 8px 8px 0 0;
            border-bottom: 4px solid #c9a84c;
          }

          .print-header-left {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .print-logo {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            border: 2px solid #c9a84c;
            object-fit: cover;
          }

          .print-brand {
            font-size: 22px;
            font-weight: 700;
            margin: 0;
            color: #ffffff;
          }

          .print-brand-gold {
            color: #c9a84c;
          }

          .print-subtitle {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.75);
            margin: 2px 0 0 0;
          }

          .print-header-right {
            text-align: right;
          }

          .print-hotel-name {
            font-size: 13px;
            font-weight: 600;
            margin: 0;
            color: #ffffff;
          }

          .print-date-range,
          .print-generated {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.65);
            margin: 2px 0 0 0;
          }

          /* ----- Simple header (page 2+) ----- */
          .print-header-simple {
            text-align: center;
            font-size: 12px;
            font-weight: 600;
            color: #4b5563;
            border-bottom: 1px solid #d1d5db;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }

          /* ----- Summary cards (page 1 only) ----- */
          .print-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 16px 0;
          }

          .print-summary-card {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            background: #f9fafb;
          }

          .print-summary-value {
            font-size: 18px;
            font-weight: 700;
            color: #0f1b2d;
          }

          .print-summary-label {
            font-size: 10px;
            color: #4b5563;
            margin-top: 2px;
          }

          .print-summary-sub {
            font-size: 9px;
            color: #9ca3af;
          }

          /* ----- Table ----- */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          .print-table th {
            text-align: left;
            background: #f3f4f6;
            color: #374151;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            border: 1px solid #d1d5db;
            padding: 6px 8px;
          }

          .print-table td {
            border: 1px solid #e5e7eb;
            padding: 6px 8px;
          }

          .print-table tbody tr {
            page-break-inside: avoid;
          }

          .print-cell-strong {
            font-weight: 600;
          }

          .print-cell-gold {
            color: #c9a84c;
            font-weight: 600;
          }

          .print-no-data {
            text-align: center;
            padding: 24px 0;
            color: #8a8278;
          }

          .print-page-total-row {
            background: #f9fafb;
            font-weight: 600;
          }

          .print-grand-total-row {
            background: #eff6ff;
            font-weight: 700;
          }

          .print-total-label {
            text-align: right;
          }

          /* ----- Footer ----- */
          .print-footer {
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            margin-top: 10px;
            padding-top: 6px;
            border-top: 1px solid #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
}
