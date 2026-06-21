// src/components/dashboard/TopBar.jsx
import React from "react";

export default function TopBar({ onMenuClick, view, onViewChange }) {
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
        </div>
      </div>
    </header>
  );
}
