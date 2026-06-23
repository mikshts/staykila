// src/components/modals/PriceModal.jsx
import React, { useState } from "react";

export default function PriceModal({
  prices,
  onPricesChange,
  onSave,
  onClose,
}) {
  const [selectedRoomType, setSelectedRoomType] = useState("single");

  const roomTypes = [
    { id: "single", label: "Single Bed", icon: "🛏️" },
    { id: "double", label: "Double Bed", icon: "🛏️🛏️" },
    { id: "family", label: "Family Room", icon: "🏠" },
  ];

  const durations = [
    { hours: 1, label: "Quick rest" },
    { hours: 3, label: "Short stay" },
    { hours: 6, label: "Half day" },
    { hours: 12, label: "Day use" },
    { hours: 24, label: "Overnight" },
  ];

  // Get price for specific room type
  const getPriceForType = (hours, type) => {
    const key = `${type}_${hours}`;
    return prices[key] || prices[hours] || hours * 100;
  };

  // src/components/modals/PriceModal.jsx
  // This part is already correct - it uses ${selectedRoomType}_${hours} as the key
  const handlePriceChange = (hours, value) => {
    let newValue = value;
    if (newValue.startsWith("0") && newValue.length > 1) {
      newValue = newValue.replace(/^0+/, "");
    }
    const numValue = newValue === "" ? "" : parseFloat(newValue);

    // Store with room type prefix - THIS IS CORRECT
    const key = `${selectedRoomType}_${hours}`;
    onPricesChange({
      ...prices,
      [key]: numValue,
    });
  };

  const getDisplayValue = (hours) => {
    const key = `${selectedRoomType}_${hours}`;
    const val = prices[key];
    if (val === undefined || val === null) return "";
    if (val === 0) return "";
    return val;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
          Edit Room Prices
        </h3>
        <p className="text-xs text-[#8a8278] mb-4">
          Set custom prices for each room type and duration
        </p>

        {/* Room Type Selection */}
        <div className="flex gap-2 mb-4">
          {roomTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedRoomType(type.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                selectedRoomType === type.id
                  ? "bg-[#c9a84c] text-white shadow-md"
                  : "bg-[#f7f3ee] text-[#8a8278] hover:bg-[#e5e2db]"
              }`}>
              <span className="mr-1">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {durations.map((d) => {
            const displayValue = getDisplayValue(d.hours);
            return (
              <div
                key={d.hours}
                className="flex items-center justify-between p-2 bg-[#f7f3ee] rounded-xl">
                <div>
                  <span className="font-medium">{d.hours}h</span>
                  <span className="text-xs text-[#8a8278] ml-2">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#8a8278]">₱</span>
                  <input
                    type="number"
                    value={displayValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        handlePriceChange(d.hours, "");
                      } else {
                        const cleanVal = val.replace(/^0+/, "");
                        if (cleanVal === "") {
                          handlePriceChange(d.hours, "");
                        } else {
                          handlePriceChange(d.hours, cleanVal);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      if (val === "" || val === "0") {
                        handlePriceChange(d.hours, 0);
                      }
                    }}
                    className="w-20 px-2 py-1 border border-[#e5e2db] rounded-lg text-sm font-medium text-[#0f1b2d] focus:border-[#c9a84c] outline-none"
                    min="0"
                    step="10"
                    placeholder="0"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition">
            Save Prices
          </button>
        </div>
      </div>
    </div>
  );
}
