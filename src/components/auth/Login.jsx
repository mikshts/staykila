// src/components/auth/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await login(email, password);
    setLoading(false);
    if (!error) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0f1b2d] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-hotel text-[#c9a84c] text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-[#0f1b2d]">StayKila</h1>
          <p className="text-gray-500 text-sm">Lodge Management Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="hotel@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f1b2d] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          New property?{" "}
          <Link
            to="/register"
            className="text-[#0f1b2d] font-semibold hover:underline">
            Create account →
          </Link>
        </p>

        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
          <i className="fas fa-info-circle text-[#c9a84c] mr-1"></i>
          <b>Demo accounts</b>
          <br />
          sunset@beach.com / sunset123
          <br />
          mountain@inn.com / mountain123
        </div>
      </div>
    </div>
  );
}
