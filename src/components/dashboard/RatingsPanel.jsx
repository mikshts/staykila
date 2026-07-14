// src/components/dashboard/RatingsPanel.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function RatingsPanel({ hotel, onClose }) {
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState([]);
  const [summary, setSummary] = useState({
    overall: { average: 0, count: 0 },
    single: { average: 0, count: 0 },
    double: { average: 0, count: 0 },
    family: { average: 0, count: 0 },
  });
  const [recentRatings, setRecentRatings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [selectedRoomType, setSelectedRoomType] = useState(null);

  const calculateSummary = (ratingsData) => {
    const roomTypes = ["single", "double", "family"];
    const result = {
      overall: {
        average: 0,
        count: 0,
        stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      single: { average: 0, count: 0, stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      double: { average: 0, count: 0, stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      family: { average: 0, count: 0, stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    };

    // Calculate per room type
    roomTypes.forEach((type) => {
      const typeRatings = ratingsData.filter((r) => r.room_type === type);
      const typeCount = typeRatings.length;
      if (typeCount > 0) {
        const typeSum = typeRatings.reduce((sum, r) => sum + r.rating, 0);
        result[type].average = typeSum / typeCount;
        result[type].count = typeCount;

        // Count stars
        typeRatings.forEach((r) => {
          result[type].stars[r.rating] =
            (result[type].stars[r.rating] || 0) + 1;
        });
      }
    });

    // Calculate overall (all ratings)
    const allRatings = ratingsData;
    const totalCount = allRatings.length;
    if (totalCount > 0) {
      const totalSum = allRatings.reduce((sum, r) => sum + r.rating, 0);
      result.overall.average = totalSum / totalCount;
      result.overall.count = totalCount;

      allRatings.forEach((r) => {
        result.overall.stars[r.rating] =
          (result.overall.stars[r.rating] || 0) + 1;
      });
    }

    setSummary(result);
  };

  const fetchRatings = async () => {
    try {
      setLoading(true);

      // Fetch all ratings for this hotel
      const { data, error } = await supabase
        .from("ratings")
        .select(
          `
          *,
          rooms:room_id (name, room_number)
        `,
        )
        .eq("hotel_id", hotel.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRatings(data || []);
      setRecentRatings((data || []).slice(0, 10));
      calculateSummary(data || []);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      toast.error("Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hotel?.id) {
      fetchRatings();
    }
  }, [hotel]);

  // Realtime: refresh when a rating is added/updated/deleted
  useEffect(() => {
    if (!hotel?.id) return;
    const channel = supabase
      .channel(`ratings-${hotel.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ratings",
          filter: `hotel_id=eq.${hotel.id}`,
        },
        () => fetchRatings(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotel?.id, fetchRatings]);

  const getFilteredRatings = () => {
    if (filter === "all") return recentRatings;
    return recentRatings.filter((r) => r.room_type === filter);
  };

  const renderStars = (rating, maxStars = 5) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-[#c9a84c]">
            ★
          </span>
        ))}
        {hasHalfStar && <span className="text-[#c9a84c]">★</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-600">
            ☆
          </span>
        ))}
        <span className="ml-2 text-white/60 text-sm">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const StatCard = ({ title, data, roomType }) => (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white/70 text-sm font-medium">{title}</h4>
        <span className="text-xs text-gray-500">{data.count} reviews</span>
      </div>
      {data.count > 0 ? (
        <>
          <div className="text-3xl font-bold text-white mb-1">
            {data.average.toFixed(1)}
          </div>
          {renderStars(data.average)}
          <div className="mt-2 grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-1">
                <span className="text-[10px] text-gray-500">{star}★</span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#c9a84c] rounded-full"
                    style={{
                      width:
                        data.count > 0
                          ? `${(data.stars[star] / data.count) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-gray-500 text-sm">No ratings yet</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-[#0f1b2d] rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c9a84c]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f1b2d] rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">⭐ Hotel Ratings</h2>
            <p className="text-gray-400 text-sm">
              Overall Rating: {renderStars(summary.overall.average)}
              <span className="ml-2 text-gray-500">
                ({summary.overall.count} reviews)
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Summary Cards by Room Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="🛏️ Single Rooms"
            data={summary.single}
            roomType="single"
          />
          <StatCard
            title="🛏️🛏️ Double Rooms"
            data={summary.double}
            roomType="double"
          />
          <StatCard
            title="🏠 Family Rooms"
            data={summary.family}
            roomType="family"
          />
        </div>

        {/* Filter and Recent Ratings */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white/60 text-sm font-medium">Filter:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === "all"
                  ? "bg-[#c9a84c] text-[#0f1b2d]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}>
              All
            </button>
            <button
              onClick={() => setFilter("single")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === "single"
                  ? "bg-[#c9a84c] text-[#0f1b2d]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}>
              Single
            </button>
            <button
              onClick={() => setFilter("double")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === "double"
                  ? "bg-[#c9a84c] text-[#0f1b2d]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}>
              Double
            </button>
            <button
              onClick={() => setFilter("family")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === "family"
                  ? "bg-[#c9a84c] text-[#0f1b2d]"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}>
              Family
            </button>
          </div>

          <h3 className="text-white/80 text-sm font-medium mb-3">
            Recent Reviews
          </h3>

          {getFilteredRatings().length === 0 ? (
            <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
              <i className="fas fa-star text-gray-600 text-3xl mb-2 block"></i>
              <p className="text-gray-400">No ratings yet</p>
              <p className="text-gray-500 text-sm">
                Reviews will appear here once guests rate their stay
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {getFilteredRatings().map((rating) => (
                <div
                  key={rating.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {rating.guest_name || "Guest"}
                        </span>
                        <span className="text-xs text-white/30">•</span>
                        <span className="text-xs text-white/40">
                          {rating.rooms?.name || `Room ${rating.room_number}`}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            rating.room_type === "single"
                              ? "bg-blue-500/20 text-blue-400"
                              : rating.room_type === "double"
                                ? "bg-purple-500/20 text-purple-400"
                                : "bg-amber-500/20 text-amber-400"
                          }`}>
                          {rating.room_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(rating.rating)}
                      </div>
                      {rating.review && (
                        <p className="text-gray-300 text-sm mt-2 italic">
                          "{rating.review}"
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(201, 168, 76, 0.4);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(201, 168, 76, 0.6);
          }
        `}</style>
      </div>
    </div>
  );
}
