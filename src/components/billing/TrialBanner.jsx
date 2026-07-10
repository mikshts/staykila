// src/components/billing/TrialBanner.jsx
export default function TrialBanner({ daysRemaining, onSubscribe }) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
      <div className="flex items-center justify-between flex-wrap">
        <div>
          <p className="text-yellow-700 font-semibold">
            ⚠️ Your trial ends in {daysRemaining} days.
          </p>
          <p className="text-yellow-600 text-sm">
            Add your payment method to avoid interruption.
          </p>
        </div>
        <button
          onClick={onSubscribe}
          className="mt-2 sm:mt-0 bg-[#c9a84c] text-[#0f1b2d] px-4 py-2 rounded-lg font-medium hover:bg-[#b8973a] transition">
          Add Payment Method
        </button>
      </div>
    </div>
  );
}
