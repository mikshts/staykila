// src/components/billing/BillingCard.jsx
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../hooks/useSubscription";

export default function BillingCard() {
  const navigate = useNavigate();
  const {
    subscription,
    isTrial,
    isActive,
    isExpired,
    trialDaysRemaining,
    daysUntilExpiration,
  } = useSubscription();

  if (!subscription) return null;

  let statusText = "";
  let statusColor = "";
  if (isTrial) {
    statusText = `Trial · ${trialDaysRemaining} days remaining`;
    statusColor = "text-[#c9a84c]";
  } else if (isActive) {
    statusText = `Active · renews in ${daysUntilExpiration} days`;
    statusColor = "text-green-600";
  } else if (isExpired) {
    statusText = "Expired";
    statusColor = "text-red-600";
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Current Plan
          </p>
          <p className="text-lg font-bold text-[#0f1b2d]">
            {subscription.room_count} Rooms
          </p>
          <p className={`text-sm ${statusColor}`}>{statusText}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Monthly</p>
          <p className="text-xl font-bold text-[#0f1b2d]">
            ₱{subscription.monthly_amount?.toLocaleString()}
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate("/billing")}
        className="mt-3 w-full bg-[#0f1b2d] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#1a2d4a] transition">
        Manage Plan
      </button>
    </div>
  );
}
