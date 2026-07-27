// src/components/dashboard/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar({
  isOpen,
  onClose,
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
  onRatingsClick,
  user,
  onLogout,
  onResetTotals,
  isExpired,
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
        className={`fixed lg:sticky top-0 left-0 h-screen w-[200px] bg-[#0f1b2d] z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } overflow-y-auto overflow-x-hidden`}>
        {/* Logo */}
        <div className="p-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img
                src="/favicon1.png"
                alt="StayKila"
                className="w-7 h-7 rounded-lg border border-[#c9a84c]/30 shadow-xl object-cover"
              />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#c9a84c]/20 rounded-full blur-sm"></div>
            </div>
            <div>
              <div className="text-white text-sm font-bold">
                Stay<span className="text-[#c9a84c]">Kila</span>
              </div>
              <div className="text-white/40 text-[8px] uppercase tracking-wider">
                Lodge Management
              </div>
            </div>
          </div>
          <button
            className="lg:hidden absolute top-2 right-2 text-white/60 hover:text-white"
            onClick={onClose}>
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Navigation — no overflow scroll, all items fit */}
        <nav className="px-1 py-1 space-y-0.5">
          {!isExpired ? (
            <>
              {/* Operations */}
              <div className="text-white/25 text-[7px] font-semibold tracking-wider uppercase px-2 pt-2 pb-1">
                Operations
              </div>
              {/* Rooms */}
              <button
                onClick={() => onFilterChange("all")}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
                  filter === "all"
                    ? "text-[#c9a84c] bg-[#c9a84c]/10 border-l-2 border-[#c9a84c]"
                    : "text-white/55 hover:text-white hover:bg-white/5"
                }`}>
                <i className="fas fa-door-open w-4 text-center"></i>
                Rooms
                <span className="ml-auto text-white/30 text-xs">
                  {roomCount}
                </span>
              </button>
              {stats.expiring + stats.expired > 0 && (
                <button
                  onClick={() => onFilterChange("alerts")}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition ${
                    filter === "alerts"
                      ? "text-[#c9a84c] bg-[#c9a84c]/10 border-l-2 border-[#c9a84c]"
                      : "text-white/55 hover:text-white hover:bg-white/5"
                  }`}>
                  <i className="fas fa-triangle-exclamation w-4 text-center"></i>
                  Alerts
                  <span className="ml-auto bg-orange-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">
                    {stats.expiring + stats.expired}
                  </span>
                </button>
              )}
              <button
                onClick={onMessagesClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-envelope w-4 text-center"></i>
                Messages
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={onActivityClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-list-ul w-4 text-center"></i>
                Activity
              </button>

              {/* Analytics */}
              <div className="text-white/25 text-[7px] font-semibold tracking-wider uppercase px-2 pt-3 pb-1">
                Analytics
              </div>
              <button
                onClick={onAnalyticsClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-chart-pie w-4 text-center"></i>
                Analytics
              </button>
              <button
                onClick={onReportsClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-file-invoice w-4 text-center"></i>
                Night Audit
              </button>
              <button
                onClick={onRatingsClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-star w-4 text-center text-[#c9a84c]"></i>
                Ratings
              </button>
              <button
                onClick={onCalendarClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-calendar-alt w-4 text-center"></i>
                Calendar
              </button>

              {/* Management */}
              <div className="text-white/25 text-[7px] font-semibold tracking-wider uppercase px-2 pt-3 pb-1">
                Management
              </div>
              <button
                onClick={onQRDownloadClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-qrcode w-4 text-center"></i>
                QR Codes
              </button>
              <button
                onClick={onPriceClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-tag w-4 text-center"></i>
                Edit Prices
              </button>
              <button
                onClick={onWifiClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-wifi w-4 text-center"></i>
                WiFi
              </button>
              <button
                onClick={onMenuClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-utensils w-4 text-center"></i>
                Menu
              </button>
              <button
                onClick={onSettingsClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-md transition">
                <i className="fas fa-gear w-4 text-center"></i>
                Settings
              </button>

              {/* Danger Zone */}
              <div className="text-white/25 text-[7px] font-semibold tracking-wider uppercase px-2 pt-3 pb-1">
                Danger Zone
              </div>
              <button
                onClick={onResetTotals}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-md transition">
                <i className="fas fa-trash w-4 text-center"></i>
                Reset Totals
              </button>
            </>
          ) : (
            <div className="mt-2 px-2 text-white/60 text-[11px]">
              <p className="text-center">Subscription expired.</p>
              <p className="text-center text-[9px] mt-0.5 text-white/40">
                Renew to access all features.
              </p>
            </div>
          )}

          {/* Billing — always visible */}
          <Link
            to="/billing"
            className="mt-1 flex items-center gap-2 px-2 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-md transition">
            <i className="fas fa-credit-card w-3.5 text-center"></i>
            Billing
          </Link>
        </nav>

        {/* Footer (always visible) */}
        <div className="flex-shrink-0 p-2 border-t border-white/10 bg-[#0f1b2d]">
          <div className="text-white/40 text-[9px] mb-1 truncate overflow-hidden text-ellipsis whitespace-nowrap">
            <i className="fas fa-user mr-1"></i>
            {user?.email || "Guest"}
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/70 text-[11px] py-1 px-2 border border-white/10 rounded-md transition hover:bg-white/5">
            <i className="fas fa-sign-out-alt"></i>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
