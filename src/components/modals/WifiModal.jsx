// src/components/modals/WifiModal.jsx
import React, { useState } from "react";

export default function WifiModal({ currentPassword, onSave, onClose }) {
  const [wifiInput, setWifiInput] = useState(currentPassword);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
          <i className="fas fa-wifi text-blue-500 mr-2"></i>WiFi Settings
        </h3>
        <p className="text-xs text-[#8a8278] mb-4">
          Set the WiFi password that guests will see on their portal
        </p>

        <div className="mb-4">
          <label className="text-sm font-medium text-[#0f1b2d] block mb-1">
            WiFi Password / Network name
          </label>
          <input
            type="text"
            value={wifiInput}
            onChange={(e) => setWifiInput(e.target.value)}
            placeholder="e.g. resort_wifi_2025"
            className="w-full px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Cancel
          </button>
          <button
            onClick={() => onSave(wifiInput)}
            className="flex-1 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
            <i className="fas fa-save mr-1"></i>Save
          </button>
        </div>
      </div>
    </div>
  );
}
