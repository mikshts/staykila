// src/components/modals/PriceModal.jsx
import React from "react";

export default function PriceModal({
  prices,
  onPricesChange,
  onSave,
  onClose,
}) {
  const durations = [
    { hours: 1, label: "Quick rest" },
    { hours: 3, label: "Short stay" },
    { hours: 6, label: "Half day" },
    { hours: 12, label: "Day use" },
    { hours: 24, label: "Overnight" },
  ];

  const handlePriceChange = (hours, value) => {
    // Remove leading zeros and handle empty input
    let newValue = value;

    // If value starts with 0 and length > 1, remove the leading zero
    if (newValue.startsWith("0") && newValue.length > 1) {
      newValue = newValue.replace(/^0+/, "");
    }

    // Convert to number or keep as empty string
    const numValue = newValue === "" ? "" : parseFloat(newValue);

    onPricesChange({
      ...prices,
      [hours]: numValue,
    });
  };

  const getDisplayValue = (hours) => {
    const val = prices[hours];
    // If price is undefined or null, show empty string
    if (val === undefined || val === null) return "";
    // If price is 0, show empty string (so user can type)
    if (val === 0) return "";
    // Otherwise show the value
    return val;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
          Edit Room Prices
        </h3>
        <p className="text-xs text-[#8a8278] mb-4">
          Set your custom prices for each duration
        </p>

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
                      // Allow empty string for user to type
                      if (val === "") {
                        handlePriceChange(d.hours, "");
                      } else {
                        // Remove leading zeros
                        const cleanVal = val.replace(/^0+/, "");
                        if (cleanVal === "") {
                          handlePriceChange(d.hours, "");
                        } else {
                          handlePriceChange(d.hours, cleanVal);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      // When user leaves the field, ensure it has a value
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
