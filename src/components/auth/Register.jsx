// src/components/auth/Register.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    email: "",
    password: "",
    rooms: 10,
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await register(formData.email, formData.password, {
      name: formData.name,
      owner: formData.owner,
      rooms: formData.rooms,
    });
    setLoading(false);
    if (!error) {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1b2d] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#0f1b2d] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-building text-[#c9a84c] text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-[#0f1b2d]">
            Register Property
          </h1>
          <p className="text-gray-500 text-sm">
            Create your management account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Property name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="Sunset Beach Resort"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Owner / Manager name
            </label>
            <input
              type="text"
              value={formData.owner}
              onChange={(e) =>
                setFormData({ ...formData, owner: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="Maria Santos"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Email (used to sign in)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="maria@resort.com"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#0f1b2d] mb-1">
              Number of rooms (1–300)
            </label>
            <input
              type="number"
              value={formData.rooms}
              onChange={(e) =>
                setFormData({ ...formData, rooms: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#c9a84c]"
              placeholder="20"
              min={1}
              max={300}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0f1b2d] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link
            to="/login"
            className="text-[#0f1b2d] font-semibold hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
