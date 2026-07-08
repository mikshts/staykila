// src/pages/PricingPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PricingCalculator from "../components/pricing/PricingCalculator";
import { useBrandFonts } from "../hooks/useBrandFonts";
import { Eyebrow } from "../components/common/Eyebrow"; // we'll create this

export default function PricingPage() {
  useBrandFonts();
  const navigate = useNavigate();
  const [selectedRooms, setSelectedRooms] = useState(25);

  const handleGetStarted = () => {
    // Store preferred rooms in sessionStorage so AuthCallback can read it
    sessionStorage.setItem("preferredRooms", selectedRooms.toString());
    navigate("/signin");
  };

  return (
    <div className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background – same luxury style as login */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1b2d]/90 via-[#0f1b2d]/95 to-[#0f1b2d]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,168,76,0.05),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl shadow-black/40">
          <div className="text-center mb-8">
            <Eyebrow>Simple, transparent pricing</Eyebrow>
            <h1
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-3xl sm:text-4xl md:text-5xl text-white font-medium leading-tight">
              Pay only for the rooms you manage.
            </h1>
            <p className="text-gray-400 mt-2">
              No fixed plans. No hidden fees. Scale with your property.
            </p>
          </div>

          <PricingCalculator
            initialRooms={25}
            onRoomCountChange={setSelectedRooms}
            showYearly={true}
          />

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] font-semibold rounded-xl hover:shadow-[0_12px_32px_-8px_rgba(201,168,76,0.55)] hover:-translate-y-0.5 transition-all duration-200">
              Start Free Trial
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            30‑day free trial · No credit card required · Cancel anytime
          </p>
        </motion.div>
      </div>
    </div>
  );
}
