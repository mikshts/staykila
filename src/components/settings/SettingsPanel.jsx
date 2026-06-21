// src/components/settings/SettingsPanel.jsx
import React, { useRef, useEffect } from "react";

export default function SettingsPanel({
  hotel,
  rooms,
  prices,
  wifiPassword,
  menuImages,
  onClose,
  onOpenWifi,
  onOpenMenu,
  onOpenPrice,
}) {
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-md h-full overflow-y-auto">
        <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Settings</div>
            <div className="text-xs text-white/50">{hotel?.name}</div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4">
          {/* Property Info */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
            Property info
          </div>
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm leading-relaxed">
            <div>
              <b>Hotel:</b> {hotel?.name}
            </div>
            <div>
              <b>Owner:</b> {hotel?.owner}
            </div>
            <div>
              <b>Email:</b> {hotel?.email}
            </div>
            <div>
              <b>Rooms:</b> {rooms.length}
            </div>
            <div>
              <b>Plan:</b> {hotel?.plan || "Basic"}
            </div>
          </div>

          {/* Current Prices */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
            Current Prices
          </div>
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm leading-relaxed">
            {[1, 3, 6, 12, 24].map((h) => (
              <div key={h}>
                <b>{h}h:</b> ₱{prices[h] || 0}
              </div>
            ))}
            <button
              onClick={onOpenPrice}
              className="mt-2 px-4 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
              <i className="fas fa-edit mr-1"></i>Edit Prices
            </button>
          </div>

          {/* WiFi */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
            WiFi
          </div>
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm">
            <div>
              <b>Current password:</b> {wifiPassword || "(not set)"}
            </div>
            <button
              onClick={onOpenWifi}
              className="mt-2 px-4 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
              <i className="fas fa-edit mr-1"></i>Change WiFi
            </button>
          </div>

          {/* Room Service Menu */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
            Room Service Menu
          </div>
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-sm">
            {menuImages.length === 0 ? (
              <span className="text-[#8a8278]">No menu images uploaded</span>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {menuImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url}
                    alt="Menu"
                    className="h-20 w-full object-cover rounded-lg border"
                  />
                ))}
              </div>
            )}
            <button
              onClick={onOpenMenu}
              className="mt-2 px-4 py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
              <i className="fas fa-edit mr-1"></i>Manage Menu (
              {menuImages.length}/6)
            </button>
          </div>

          {/* Plan limits */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8a8278] mb-2">
            Plan limits
          </div>
          <div className="bg-[#f7f3ee] rounded-xl p-4 mb-4 text-xs text-[#8a8278] leading-relaxed">
            <div>Basic — up to 20 rooms · ₱299/mo</div>
            <div>Pro — up to 50 rooms · ₱599/mo</div>
            <div>Unlimited — no limit · ₱999/mo</div>
          </div>
        </div>
      </div>
    </div>
  );
}
