// src/components/dashboard/TopBar.jsx
import React from "react";

export default function TopBar({
  onMenuClick,
  view,
  onViewChange,
  soundEnabled, // ← Add this
  onSoundToggle, // ← Add this (or setSoundEnabled)
}) {
  return (
    <header className="bg-white border-b border-[#e5e2db] sticky top-0 z-30 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden text-[#0f1b2d]" onClick={onMenuClick}>
          <i className="fas fa-bars text-xl"></i>
        </button>
        <div>
          <h1 className="text-base font-bold text-[#0f1b2d] truncate">Rooms</h1>
          <p className="text-[10px] text-[#8a8278] truncate">
            {new Date().toLocaleDateString("en-PH", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => onViewChange("grid")}
            className={`px-2 py-1 rounded text-xs border transition ${
              view === "grid"
                ? "bg-[#0f1b2d] text-white border-[#0f1b2d]"
                : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-[#0f1b2d]"
            }`}>
            <i className="fas fa-grid-2"></i>
            <span className="hidden sm:inline ml-1">Grid</span>
          </button>
          <button
            onClick={() => onViewChange("list")}
            className={`px-2 py-1 rounded text-xs border transition ${
              view === "list"
                ? "bg-[#0f1b2d] text-white border-[#0f1b2d]"
                : "bg-white text-[#8a8278] border-[#e5e2db] hover:border-[#0f1b2d]"
            }`}>
            <i className="fas fa-list"></i>
            <span className="hidden sm:inline ml-1">List</span>
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={onSoundToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              soundEnabled
                ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200"
                : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
            }`}
            title={soundEnabled ? "Sound alerts on" : "Sound alerts off"}>
            <i
              className={`fas ${soundEnabled ? "fa-volume-up" : "fa-volume-mute"}`}></i>
            {soundEnabled ? "Sound On" : "Sound Off"}
          </button>
        </div>
      </div>
    </header>
  );
}
