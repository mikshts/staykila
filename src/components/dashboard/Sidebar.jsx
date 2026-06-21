// src/components/dashboard/Sidebar.jsx
import React from "react";

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
  user,
  onLogout,
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
        } overflow-y-auto`}>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="text-white text-lg font-bold">
            Stay<span className="text-[#c9a84c]">Kila</span>
          </div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider">
            Lodge Management
          </div>
          <button
            className="lg:hidden absolute top-4 right-4 text-white/60 hover:text-white"
            onClick={onClose}>
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Hotel Badge */}
        <div className="m-4 p-3 bg-white/5 border border-white/10 rounded-xl">
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

        {/* Navigation - Added pb-32 to prevent footer overlap */}
        <nav className="px-2 py-4 pb-32">
          <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pb-2">
            Operations
          </div>

          <button
            onClick={() => onFilterChange("all")}
            className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition ${
              filter === "all"
                ? "text-[#c9a84c] bg-[#c9a84c]/10 border-l-2 border-[#c9a84c]"
                : "text-white/55 hover:text-white hover:bg-white/5"
            }`}>
            <i className="fas fa-door-open w-5 text-center"></i>
            Rooms
            <span className="ml-auto text-white/30 text-xs">{roomCount}</span>
          </button>

          {stats.expiring + stats.expired > 0 && (
            <button
              onClick={() => onFilterChange("expiring")}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
              <i className="fas fa-triangle-exclamation w-5 text-center"></i>
              Alerts
              <span className="ml-auto bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                {stats.expiring + stats.expired}
              </span>
            </button>
          )}

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

          <button
            onClick={onActivityClick}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-list-ul w-5 text-center"></i>
            Activity
          </button>

          <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
            Utilities
          </div>

          <button
            onClick={onQRDownloadClick}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-qrcode w-5 text-center"></i>
            Download QR Codes
            <span className="ml-auto text-white/30 text-[9px]">
              <i className="fas fa-download"></i>
            </span>
          </button>

          <div className="text-white/30 text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
            Reports
          </div>

          <button
            onClick={onReportsClick}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-file-invoice w-5 text-center"></i>
            Night Audit
            <span className="ml-auto text-white/30 text-[9px]">
              <i className="fas fa-print"></i>
            </span>
          </button>

          <button
            onClick={onSettingsClick}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-gear w-5 text-center"></i>
            Settings
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

          {/* Room Service Menu - Now visible with pb-32 padding */}
          <button
            onClick={onMenuClick}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="fas fa-utensils w-5 text-center"></i>
            Room Service Menu
          </button>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#0f1b2d]">
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
