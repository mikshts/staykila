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
      <style>{`
        .sb-aside {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #14213D;
          display: flex;
          flex-direction: column;
        }
        .sb-head { position: relative; flex-shrink: 0; }
        .sb-mark { font-family: 'Fraunces', Georgia, serif; }
        .sb-badge {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .sb-bar-fill {
          background: #C9A24B;
        }
        .sb-section-label {
          color: rgba(255,255,255,0.32);
        }
        .sb-nav { flex: 1 1 auto; overflow-y: auto; min-height: 0; }
        .sb-item {
          color: rgba(255,255,255,0.6);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .sb-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .sb-item.active {
          color: #C9A24B;
          background: rgba(201,162,75,0.1);
          border-left: 2px solid #C9A24B;
        }
        .sb-count { color: rgba(255,255,255,0.3); }
        .sb-pill-orange { background: #C0563B; color: #fff; }
        .sb-pill-red { background: #D9534F; color: #fff; }
        .sb-footer {
          flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.08);
          background: #14213D;
        }
        .sb-signout {
          color: rgba(255,255,255,0.45);
          border: 1px solid rgba(255,255,255,0.1);
          transition: background 0.15s ease, color 0.15s ease;
        }
        .sb-signout:hover { color: rgba(255,255,255,0.85); background: rgba(255,255,255,0.05); }
        .sb-item:focus-visible,
        .sb-signout:focus-visible,
        .sb-close:focus-visible {
          outline: 2px solid #C9A24B;
          outline-offset: 2px;
        }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;500;600;700&display=swap"
      />

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`sb-aside fixed lg:sticky top-0 left-0 h-screen w-[240px] z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>
        {/* Logo */}
        <div className="sb-head p-6 border-b border-white/10">
          <div className="sb-mark text-white text-lg font-bold">
            Stay<span className="text-[#C9A24B]">Kila</span>
          </div>
          <div className="text-white/40 text-[10px] uppercase tracking-wider">
            Lodge Management
          </div>
          <button
            className="sb-close lg:hidden absolute top-4 right-4 text-white/60 hover:text-white"
            onClick={onClose}>
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Hotel Badge */}
        <div className="sb-badge m-4 p-3 rounded-xl flex-shrink-0">
          <div className="text-white text-sm font-semibold truncate">
            {hotelName || "Hotel"}
          </div>
          <div className="text-white/40 text-xs">{roomCount} rooms</div>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="sb-bar-fill h-full rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="text-white/30 text-[10px] mt-1">
            {occupancyRate}% occupancy
          </div>
        </div>

        {/* Navigation — scrolls independently, never collides with footer */}
        <nav className="sb-nav px-2 py-2">
          <div className="sb-section-label text-[9px] font-semibold tracking-wider uppercase px-4 pb-2 pt-2">
            Operations
          </div>

          <button
            onClick={() => onFilterChange("all")}
            className={`sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg ${
              filter === "all" ? "active" : ""
            }`}>
            <i className="fas fa-door-open w-5 text-center"></i>
            Rooms
            <span className="sb-count ml-auto text-xs">{roomCount}</span>
          </button>

          {stats.expiring + stats.expired > 0 && (
            <button
              onClick={() => onFilterChange("expiring")}
              className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
              <i className="fas fa-triangle-exclamation w-5 text-center"></i>
              Alerts
              <span className="sb-pill-orange ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full">
                {stats.expiring + stats.expired}
              </span>
            </button>
          )}

          <button
            onClick={onMessagesClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-envelope w-5 text-center"></i>
            Messages
            {unreadCount > 0 && (
              <span className="sb-pill-red ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={onActivityClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-list-ul w-5 text-center"></i>
            Activity
          </button>

          <div className="sb-section-label text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
            Utilities
          </div>

          <button
            onClick={onQRDownloadClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-qrcode w-5 text-center"></i>
            Download QR Codes
            <span className="sb-count ml-auto text-[9px]">
              <i className="fas fa-download"></i>
            </span>
          </button>

          <div className="sb-section-label text-[9px] font-semibold tracking-wider uppercase px-4 pt-6 pb-2">
            Reports
          </div>

          <button
            onClick={onReportsClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-file-invoice w-5 text-center"></i>
            Night Audit
            <span className="sb-count ml-auto text-[9px]">
              <i className="fas fa-print"></i>
            </span>
          </button>

          <button
            onClick={onSettingsClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-gear w-5 text-center"></i>
            Settings
          </button>

          <button
            onClick={onPriceClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-tag w-5 text-center"></i>
            Edit Prices
          </button>

          <button
            onClick={onWifiClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg">
            <i className="fas fa-wifi w-5 text-center"></i>
            WiFi Settings
          </button>

          <button
            onClick={onMenuClick}
            className="sb-item w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg mb-2">
            <i className="fas fa-utensils w-5 text-center"></i>
            Room Service Menu
          </button>
        </nav>

        {/* Footer — sits in normal flow at the bottom of the flex column, always visible, never overlapped */}
        <div className="sb-footer p-4">
          <div className="text-white/40 text-xs mb-2 truncate overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
            <i className="fas fa-user mr-1"></i>
            {user?.email || "Guest"}
          </div>
          <button
            onClick={onLogout}
            className="sb-signout w-full flex items-center justify-center gap-2 text-sm py-2 px-4 rounded-lg">
            <i className="fas fa-sign-out-alt"></i>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
