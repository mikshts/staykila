// src/components/dashboard/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom"; // <-- Add this

export default function Sidebar({
  isOpen,
  onClose,
  hotelName,
  roomCount,
  occupancyRate,
  filter,
  onFilterChange,
  stats,
  unreadCount,
  onMessagesClick,
  onActivityClick,
  onSettingsClick,
  onPriceClick,
  onWifiClick,
  onMenuClick,
  onReportsClick,
  onQRDownloadClick,
  onCalendarClick,
  onAnalyticsClick,
  user,
  onLogout,
  onResetTotals,
  isExpired, // new prop
}) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[240px] bg-[#0f1b2d] z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } overflow-y-auto overflow-x-hidden`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/favicon1.png"
                alt="StayKila"
                className="w-10 h-10 rounded-xl border border-[#c9a84c]/30 shadow-xl object-cover"
              />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#c9a84c]/20 rounded-full blur-sm"></div>
            </div>
            <div>
              <div className="text-white text-lg font-bold">
                Stay<span className="text-[#c9a84c]">Kila</span>
              </div>
              <div className="text-white/40 text-[10px] uppercase tracking-wider">
                Lodge Management
              </div>
            </div>
          </div>
          <button
            className="lg:hidden absolute top-4 right-4 text-white/60 hover:text-white"
            onClick={onClose}>
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Hotel Badge – always visible */}
        <div className="m-4 p-3 bg-white/5 border border-white/10 rounded-xl flex-shrink-0">
          <div className="text-white text-sm font-semibold truncate">
            {hotelName || "Hotel"}
          </div>
          <div className="text-white/40 text-xs">{roomCount} rooms</div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#c9a84c] rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="text-white/30 text-[10px] mt-1">
            {occupancyRate}% occupancy
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-4 pb-4">
          {!isExpired ? (
            // ---------- FULL NAVIGATION (active / trial) ----------
            <>
              {/* SECTION 1: OPERATIONS */}
              <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pb-2">
                Operations
              </div>
              {/* Rooms */}
              <button
                onClick={() => onFilterChange("all")}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  filter === "all"
                    ? "text-[#c9a84c] bg-[#c9a84c]/10 border-l-2 border-[#c9a84c]"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}>
                <i className="fas fa-door-open w-5 text-center"></i>
                Rooms
                <span className="ml-auto text-white/30 text-xs">
                  {roomCount}
                </span>
              </button>
              {/* Alerts */}
              {stats.expiring + stats.expired > 0 && (
                <button
                  onClick={() => onFilterChange("alerts")}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition ${
                    filter === "alerts"
                      ? "text-[#c9a84c] bg-[#c9a84c]/10 border-l-2 border-[#c9a84c]"
                      : "text-white/55 hover:text-white hover:bg-white/5"
                  }`}>
                  <i className="fas fa-triangle-exclamation w-5 text-center"></i>
                  Alerts
                  <span className="ml-auto bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {stats.expiring + stats.expired}
                  </span>
                </button>
              )}
              {/* Messages */}
              <button
                onClick={onMessagesClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-envelope w-5 text-center"></i>
                Messages
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* Activity */}
              <button
                onClick={onActivityClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-list-ul w-5 text-center"></i>
                Activity
              </button>

              {/* SECTION 2: ANALYTICS */}
              <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
                Analytics
              </div>
              <button
                onClick={onAnalyticsClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-chart-pie w-5 text-center"></i>
                Analytics
              </button>
              <button
                onClick={onReportsClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-file-invoice w-5 text-center"></i>
                Night Audit
              </button>
              <button
                onClick={onCalendarClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-calendar-alt w-5 text-center"></i>
                Calendar Manager
              </button>

              {/* SECTION 3: MANAGEMENT */}
              <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
                Management
              </div>
              <button
                onClick={onQRDownloadClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-qrcode w-5 text-center"></i>
                QR Codes
              </button>
              <button
                onClick={onPriceClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-tag w-5 text-center"></i>
                Edit Prices
              </button>
              <button
                onClick={onWifiClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-wifi w-5 text-center"></i>
                WiFi Settings
              </button>
              <button
                onClick={onMenuClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-utensils w-5 text-center"></i>
                Room Service Menu
              </button>
              <button
                onClick={onSettingsClick}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
                <i className="fas fa-gear w-5 text-center"></i>
                Settings
              </button>

              {/* SECTION 4: DANGER ZONE (only if not expired) */}
              <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
                Danger Zone
              </div>
              <button
                onClick={onResetTotals}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                <i className="fas fa-trash w-5 text-center"></i>
                Reset Dashboard Totals
              </button>
              <div className="h-20" />
            </>
          ) : (
            // ---------- EXPIRED VIEW – only Billing ----------
            <div className="mt-4 px-4 text-white/60 text-sm">
              <p className="text-center">Your subscription has expired.</p>
              <p className="text-center text-xs mt-1 text-white/40">
                Please renew to access all features.
              </p>
            </div>
          )}

          {/* ---------- ALWAYS VISIBLE: Billing ---------- */}
          {/* This link appears in both states */}
          <Link
            to="/billing"
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-credit-card w-5 text-center"></i>
            Billing
          </Link>
        </div>

        {/* Footer (always visible) */}
        <div className="flex-shrink-0 p-4 border-t border-white/10 bg-[#0f1b2d]">
          <div className="text-white/40 text-xs mb-2 truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
            <i className="fas fa-user mr-1"></i>
            {user?.email || "Guest"}
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-sm py-2 px-4 border border-white/10 rounded-lg transition hover:bg-white/5">
            <i className="fas fa-sign-out-alt"></i>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
