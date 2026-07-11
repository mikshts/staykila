// src/lib/pricing.js

export const PRICING_CONFIG = {
  // ₱ per room per month. SINGLE SOURCE OF TRUTH for the frontend.
  // MUST stay in sync with PRICE_PER_ROOM in supabase/functions/create-checkout/index.ts
  // and supabase/functions/change-room-count/index.ts (edge functions cannot import this file).
  pricePerRoom: 30, // ₱ per room per month
  currency: "₱",
  currencyCode: "PHP",
  taxRate: 0, // future use
  trialDays: 30,
  minRooms: 1,
  maxRooms: 300,
};

export const calculateMonthlyPrice = (roomCount) => {
  return roomCount * PRICING_CONFIG.pricePerRoom;
};

export const calculateYearlyPrice = (roomCount) => {
  return calculateMonthlyPrice(roomCount) * 12;
};

export const formatPrice = (amount) => {
  return `${PRICING_CONFIG.currency}${amount.toLocaleString()}`;
};

export const getPricingBreakdown = (roomCount) => {
  const monthly = calculateMonthlyPrice(roomCount);
  const yearly = calculateYearlyPrice(roomCount);
  return {
    monthly,
    yearly,
    monthlyFormatted: formatPrice(monthly),
    yearlyFormatted: formatPrice(yearly),
    pricePerRoom: PRICING_CONFIG.pricePerRoom,
    pricePerRoomFormatted: formatPrice(PRICING_CONFIG.pricePerRoom),
    roomCount,
  };
};
