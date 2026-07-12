// src/components/auth/Login.jsx
// Real sign-IN screen: email/password via AuthContext.login(), plus a
// "Sign in with Google" OAuth button (OAuth signs in an existing account or
// creates one on first use). New users should use /register instead.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useBrandFonts } from "../../hooks/useBrandFonts";
import toast from "react-hot-toast";

export default function Login() {
  useBrandFonts();

  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(formData.email, formData.password);
    setLoading(false);
    if (!error) {
      navigate("/dashboard");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        console.error("Google sign-in error:", error);
        toast.error(error.message || "Failed to sign in with Google");
        setGoogleLoading(false);
      }
      // On success Supabase redirects; no need to flip loading back.
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign in with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background image and overlays */}
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

      {/* Login Card */}
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
              Welcome back
            </h1>
            <p className="text-gray-400 text-sm">
              Sign in to your StayKila account
            </p>
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#c9a84c]"
                placeholder="you@resort.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-2.5 bg-white/10 border border-white/15 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#c9a84c]"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] py-3 rounded-xl font-semibold hover:shadow-[0_8px_24px_-8px_rgba(201,168,76,0.6)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:hover:-translate-y-0">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-gray-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Google sign-in */}
          <button
            onClick={handleGoogleSignIn}
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
            {googleLoading ? "Signing in..." : "Sign in with Google"}
          </button>

          <p className="text-center text-sm text-gray-400 mt-6">
            New to StayKila?{" "}
            <Link
              to="/register"
              className="text-[#c9a84c] font-semibold hover:underline transition-colors">
              Create an account →
            </Link>
          </p>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          Secure • Protected • encrypted data
        </p>
      </div>
    </div>
  );
}
