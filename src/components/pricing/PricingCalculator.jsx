// src/components/pricing/PricingCalculator.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getPricingBreakdown, PRICING_CONFIG } from "../../lib/pricing";

export default function PricingCalculator({
  initialRooms = 25,
  onRoomCountChange,
  showYearly = true,
  className = "",
}) {
  const [roomCount, setRoomCount] = useState(initialRooms);
  const [breakdown, setBreakdown] = useState(getPricingBreakdown(initialRooms));

  useEffect(() => {
    const newBreakdown = getPricingBreakdown(roomCount);
    setBreakdown(newBreakdown);
    if (onRoomCountChange) onRoomCountChange(roomCount);
  }, [roomCount, onRoomCountChange]);

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setRoomCount(val);
  };

  const handleInputChange = (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) val = PRICING_CONFIG.minRooms;
    if (val < PRICING_CONFIG.minRooms) val = PRICING_CONFIG.minRooms;
    if (val > PRICING_CONFIG.maxRooms) val = PRICING_CONFIG.maxRooms;
    setRoomCount(val);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          How many rooms does your property have?
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={PRICING_CONFIG.minRooms}
            max={PRICING_CONFIG.maxRooms}
            value={roomCount}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#c9a84c]"
          />
          <input
            type="number"
            min={PRICING_CONFIG.minRooms}
            max={PRICING_CONFIG.maxRooms}
            value={roomCount}
            onChange={handleInputChange}
            className="w-20 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center focus:outline-none focus:border-[#c9a84c]"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{PRICING_CONFIG.minRooms}</span>
          <span>{PRICING_CONFIG.maxRooms}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs uppercase tracking-wider text-gray-400">
            Monthly
          </p>
          <motion.p
            key={breakdown.monthly}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white mt-1">
            {breakdown.monthlyFormatted}
          </motion.p>
          <p className="text-xs text-gray-500 mt-1">
            {roomCount} × {breakdown.pricePerRoomFormatted} / room
          </p>
        </div>
        {showYearly && (
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-xs uppercase tracking-wider text-gray-400">
              Yearly
            </p>
            <motion.p
              key={breakdown.yearly}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-[#c9a84c] mt-1">
              {breakdown.yearlyFormatted}
            </motion.p>
            <p className="text-xs text-gray-500 mt-1">Save 2 months</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-400 flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
        No hidden fees · Cancel anytime · 30‑day free trial
      </div>
    </div>
  );
}
