// src/components/auth/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

function useBrandFonts() {
  useState(() => {
    if (document.getElementById("staykila-fonts")) return;
    const link = document.createElement("link");
    link.id = "staykila-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function Register() {
  useBrandFonts();

  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("Google sign-up error:", error);
        toast.error(error.message || "Failed to sign up with Google");
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error("Google sign-up error:", error);
      toast.error("Failed to sign up with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background image and overlays (same as Login) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1b2d]/90 via-[#0f1b2d]/95 to-[#0f1b2d]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,168,76,0.05),transparent_60%)]" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(201,168,76,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-6 z-10 text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
        <i className="fas fa-arrow-left"></i>
        <span className="hidden sm:inline">Back to Home</span>
      </button>

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl shadow-black/40">
          {/* Branding */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <img
                src="/favicon1.png"
                alt="Logo"
                className="w-16 h-16 rounded-2xl mx-auto mb-4 border border-[#c9a84c]/30 shadow-xl object-cover"
              />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#c9a84c]/20 rounded-full blur-xl"></div>
            </div>
            <h1
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-2xl font-semibold text-white">
              StayKila
            </h1>
            <p className="text-gray-400 text-sm">
              Create your property account
            </p>
          </div>

          {/* Google-only sign-up */}
          <p className="text-center text-sm text-gray-300 mb-6">
            Sign up with your Google account to get started
          </p>

          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full bg-white text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:-translate-y-0">
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
              />
              <path
                fill="#FF3D00"
                d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
              />
              <path
                fill="#1976D2"
                d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
              />
            </svg>
            {googleLoading ? "Signing up..." : "Sign up with Google"}
          </button>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#c9a84c] font-semibold hover:underline transition-colors">
              Sign in →
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Secure sign-up • Protected by encryption
        </p>
      </div>
    </div>
  );
}
