// src/components/dashboard/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";

function SidebarItem({
  icon,
  label,
  count,
  active = false,
  disabled = false,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-[#c9a84c]/15 text-[#f1d789]"
          : danger
            ? "text-red-300/75 hover:bg-red-400/10 hover:text-red-200"
            : "text-white/65 hover:bg-white/[0.06] hover:text-white"
      }`}>
      {active && (
        <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[#e0bd62]" />
      )}
      <i
        className={`fas ${icon} w-4 text-center text-[13px] ${
          active ? "text-[#e0bd62]" : "text-white/40 group-hover:text-white/75"
        }`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && (
        <span
          className={`min-w-5 rounded-sm px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
            danger
              ? "bg-red-400/15 text-red-200"
              : active
                ? "bg-[#e0bd62]/20 text-[#f1d789]"
                : "bg-white/[0.08] text-white/60"
          }`}>
          {count}
        </span>
      )}
    </button>
  );
}

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
  hotelName,
  activePanel,
}) {
  const roomBoardActive = !activePanel && filter !== "cleaning";
  const housekeepingActive =
    activePanel === "housekeeping" || (!activePanel && filter === "cleaning");

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
        className={`fixed left-0 top-0 z-50 flex h-screen w-[264px] flex-col border-r border-white/[0.07] bg-[#101b2b] shadow-2xl shadow-black/20 transition-transform duration-300 lg:sticky lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>
        {/* Logo */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 py-4">
          <div className="relative h-10 w-10 flex-shrink-0">
            <img
              src="/favicon1.png"
              alt=""
              className="h-10 w-10 rounded-md border border-[#c9a84c]/35 object-cover"
            />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#101b2b] bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-bold leading-tight text-white">
              Stay<span className="text-[#d8b85e]">Kila</span>
            </div>
            <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Hotel Operations
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-md p-2 text-white/45 transition hover:bg-white/[0.07] hover:text-white lg:hidden"
            onClick={onClose}>
            <i className="fas fa-times text-sm" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-shrink-0 border-b border-white/[0.08] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <i className="fas fa-hotel text-[11px] text-[#d8b85e]" aria-hidden="true" />
            <span className="truncate text-xs font-semibold text-white/85">
              {hotelName || "Your Property"}
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                Occupancy
              </p>
              <p className="mt-0.5 text-[22px] font-semibold leading-none tabular-nums text-white">
                {Math.round(occupancyRate || 0)}
                <span className="ml-0.5 text-xs font-medium text-white/45">%</span>
              </p>
            </div>
            <p className="pb-0.5 text-[11px] text-white/45">
              <span className="font-semibold text-white/75">{roomCount}</span> rooms
            </p>
          </div>
          <div
            className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Room occupancy"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, occupancyRate || 0))}>
            <div
              className="h-full rounded-full bg-[#d8b85e] transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, occupancyRate || 0))}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <span className="text-white/45">Housekeeping</span>
            <span className="font-semibold tabular-nums text-white/75">
              {stats?.cleaning || 0} to clean
            </span>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4">
          <div>
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Operations
            </p>
            <div className="space-y-1">
              <SidebarItem
                icon="fa-door-open"
                label="Front Desk"
                count={roomCount}
                active={roomBoardActive}
                onClick={() => onFilterChange("all")}
              />
              <SidebarItem
                icon="fa-calendar-alt"
                label="Reservations"
                active={activePanel === "reservations"}
                disabled={isExpired}
                onClick={onCalendarClick}
              />
              <SidebarItem
                icon="fa-broom"
                label="Housekeeping"
                count={stats?.cleaning}
                active={housekeepingActive}
                onClick={() => onFilterChange("cleaning")}
              />
              <SidebarItem
                icon="fa-envelope"
                label="Guest Messages"
                count={unreadCount}
                active={activePanel === "messages"}
                disabled={isExpired}
                onClick={onMessagesClick}
              />
              <SidebarItem
                icon="fa-list-ul"
                label="Activity Log"
                active={activePanel === "activity"}
                onClick={onActivityClick}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Reports &amp; Insights
            </p>
            <div className="space-y-1">
              <SidebarItem
                icon="fa-chart-pie"
                label="Analytics"
                active={activePanel === "analytics"}
                onClick={onAnalyticsClick}
              />
              <SidebarItem
                icon="fa-file-invoice"
                label="Night Audit"
                active={activePanel === "reports"}
                onClick={onReportsClick}
              />
              <SidebarItem
                icon="fa-star"
                label="Guest Reviews"
                active={activePanel === "ratings"}
                onClick={onRatingsClick}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Property
            </p>
            <div className="space-y-1">
              <SidebarItem
                icon="fa-tag"
                label="Rates & Pricing"
                active={activePanel === "rates"}
                disabled={isExpired}
                onClick={onPriceClick}
              />
              <SidebarItem
                icon="fa-qrcode"
                label="QR Guest Access"
                active={activePanel === "qr"}
                onClick={onQRDownloadClick}
              />
              <SidebarItem
                icon="fa-wifi"
                label="Wi-Fi Access"
                active={activePanel === "wifi"}
                disabled={isExpired}
                onClick={onWifiClick}
              />
              <SidebarItem
                icon="fa-utensils"
                label="Digital Menu"
                active={activePanel === "menu"}
                disabled={isExpired}
                onClick={onMenuClick}
              />
              <SidebarItem
                icon="fa-gear"
                label="Property Settings"
                active={activePanel === "settings"}
                disabled={isExpired}
                onClick={onSettingsClick}
              />
            </div>
          </div>

          {!isExpired && (
            <div className="border-t border-white/[0.08] pt-3">
              <SidebarItem
                icon="fa-rotate-left"
                label="Reset Dashboard Totals"
                danger
                onClick={onResetTotals}
              />
            </div>
          )}

          {isExpired && (
            <div className="rounded-md border border-amber-300/20 bg-amber-200/[0.06] p-3">
              <p className="text-xs font-semibold text-amber-100">Read-only access</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/45">
                Renew the license to resume property updates.
              </p>
            </div>
          )}
        </nav>

        <div className="flex-shrink-0 border-t border-white/[0.08] px-3 py-3">
          <Link
            to="/billing"
            onClick={onClose}
            className="mb-3 flex min-h-10 items-center gap-3 rounded-md border border-white/[0.09] bg-white/[0.04] px-3 text-[12px] font-medium text-white/70 transition hover:border-[#d8b85e]/35 hover:bg-[#d8b85e]/[0.08] hover:text-[#f1d789]">
            <i className="fas fa-credit-card w-4 text-center text-[12px]" aria-hidden="true" />
            <span className="flex-1">Billing &amp; Subscription</span>
            <i className="fas fa-arrow-up-right-from-square text-[9px] text-white/30" aria-hidden="true" />
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] text-[11px] font-semibold uppercase text-[#e3c776]">
              {(user?.email || "G").slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-white/75">
                {user?.email || "Guest"}
              </p>
              <p className="mt-0.5 text-[9px] text-white/35">
                {isExpired ? "License expired" : "Property manager"}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.07] hover:text-white">
              <i className="fas fa-sign-out-alt text-xs" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
