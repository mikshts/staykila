// src/components/guest/RatingStars.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function RatingStars({
  room,
  hotel,
  booking,
  onRatingSubmitted,
}) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  // Check if this booking already has a rating
  useEffect(() => {
    if (booking?.id) {
      checkExistingRating();
    }
  }, [booking]);

  const checkExistingRating = async () => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasRated(true);
        setSelectedRating(data.rating);
        setReview(data.review || "");
        setExistingRating(data);
      }
    } catch (error) {
      console.error("Error checking existing rating:", error);
    }
  };

  const handleRatingClick = (rating) => {
    if (hasRated) {
      toast.error("You have already rated this stay");
      return;
    }
    setSelectedRating(rating);
    setShowReviewInput(true);
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    try {
      const roomType = room?.room_type || "single";

      const { data, error } = await supabase
        .from("ratings")
        .insert({
          hotel_id: hotel?.id,
          room_id: room?.id,
          booking_id: booking?.id,
          rating: selectedRating,
          review: review.trim() || null,
          room_type: roomType,
          guest_name: booking?.guest_name || "Guest",
        })
        .select()
        .single();

      if (error) throw error;

      setHasRated(true);
      setExistingRating(data);
      toast.success("Thank you for your rating! 🌟");

      if (onRatingSubmitted) {
        onRatingSubmitted(data);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
      setShowReviewInput(false);
    }
  };

  const handleUpdateRating = async () => {
    if (!existingRating) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("ratings")
        .update({
          rating: selectedRating,
          review: review.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRating.id);

      if (error) throw error;

      toast.success("Rating updated! 🌟");
      if (onRatingSubmitted) {
        onRatingSubmitted({
          ...existingRating,
          rating: selectedRating,
          review,
        });
      }
    } catch (error) {
      console.error("Error updating rating:", error);
      toast.error("Failed to update rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const Star = ({ filled, onClick, onHover, index }) => (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(0)}
      className={`text-3xl transition-all duration-200 ${
        filled
          ? "text-[#c9a84c] scale-110"
          : "text-gray-600 hover:text-gray-400"
      } ${hasRated ? "cursor-default" : "cursor-pointer hover:scale-125"}`}
      disabled={hasRated}>
      {filled ? "★" : "☆"}
    </button>
  );

  // If no booking (no active stay), show a message
  if (!booking) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-400 text-sm">No active stay to rate</p>
        <p className="text-gray-500 text-xs mt-1">
          Check in to rate your experience
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="text-center">
        <p className="text-gray-400 text-xs font-medium tracking-wider uppercase mb-2">
          {hasRated ? "Your Rating" : "Rate Your Stay"}
        </p>

        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              index={star}
              filled={(hoveredRating || selectedRating) >= star}
              onClick={() => handleRatingClick(star)}
              onHover={(idx) => !hasRated && setHoveredRating(idx)}
            />
          ))}
        </div>

        {hasRated && (
          <div className="mt-2">
            <p className="text-[#c9a84c] text-sm font-medium">
              {selectedRating === 5
                ? "🌟 Excellent!"
                : selectedRating === 4
                  ? "👍 Great!"
                  : selectedRating === 3
                    ? "👌 Good"
                    : selectedRating === 2
                      ? "😕 Needs Improvement"
                      : "😞 Poor"}
            </p>
            {review && (
              <p className="text-gray-400 text-sm mt-1 italic">"{review}"</p>
            )}
            <button
              onClick={() => setShowReviewInput(true)}
              className="mt-2 text-xs text-[#c9a84c] hover:text-[#e8d189] transition-colors">
              <i className="fas fa-edit mr-1"></i>
              Edit Review
            </button>
          </div>
        )}

        {showReviewInput && !hasRated && (
          <div className="mt-3 space-y-3">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience (optional)..."
              className="w-full px-4 py-2 bg-black/30 rounded-xl border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20 transition-all resize-none"
              rows="2"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowReviewInput(false)}
                className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={isSubmitting}
                className="px-6 py-1.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#c9a84c]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        )}

        {showReviewInput && hasRated && (
          <div className="mt-3 space-y-3">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Update your review..."
              className="w-full px-4 py-2 bg-black/30 rounded-xl border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20 transition-all resize-none"
              rows="2"
            />
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowReviewInput(false)}
                className="px-4 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpdateRating}
                disabled={isSubmitting}
                className="px-6 py-1.5 bg-gradient-to-r from-[#c9a84c] to-[#e8d189] text-[#0f1b2d] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#c9a84c]/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? "Updating..." : "Update Rating"}
              </button>
            </div>
          </div>
        )}

        {!hasRated && !showReviewInput && (
          <p className="text-gray-500 text-[10px] mt-2">
            <i className="fas fa-star text-[#c9a84c] mr-1"></i>
            Tap a star to rate your experience
          </p>
        )}
      </div>
    </div>
  );
}
