// src/components/guest/ImageViewer.jsx
import { useEffect, useState } from "react";

export default function ImageViewer({
  images,
  currentIndex,
  onClose,
  onIndexChange,
}) {
  const [index, setIndex] = useState(currentIndex || 0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === "ArrowRight" && index < images.length - 1) {
        e.preventDefault();
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [index, images.length, onClose]);

  const handlePrev = () => {
    if (index > 0) {
      const newIndex = index - 1;
      setIndex(newIndex);
      onIndexChange?.(newIndex);
    }
  };

  const handleNext = () => {
    if (index < images.length - 1) {
      const newIndex = index + 1;
      setIndex(newIndex);
      onIndexChange?.(newIndex);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 50) {
      handleNext();
    }
    if (touchStartX - touchEndX < -50) {
      handlePrev();
    }
  };

  // Handle backdrop click - only close if clicking directly on the backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      {/* Close button - top right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose();
        }}
        className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-red-500/30"
        aria-label="Close image viewer"
        type="button">
        <i className="fas fa-times text-xl"></i>
      </button>

      {/* Counter - top left */}
      <div className="absolute top-4 left-4 z-20 text-white/60 text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
        {index + 1} / {images.length}
      </div>

      {/* Main Image Container */}
      <div
        className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}>
        <img
          src={images[index]}
          alt={`Menu ${index + 1}`}
          className="w-full h-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
          loading="lazy"
          draggable="false"
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {index > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 backdrop-blur-sm z-20"
                aria-label="Previous image"
                type="button">
                <i className="fas fa-chevron-left text-sm sm:text-base"></i>
              </button>
            )}
            {index < images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/50 hover:bg-black/80 text-white/70 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 border border-white/20 backdrop-blur-sm z-20"
                aria-label="Next image"
                type="button">
                <i className="fas fa-chevron-right text-sm sm:text-base"></i>
              </button>
            )}
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4 z-20">
          <div className="flex gap-2 overflow-x-auto max-w-[90%] px-2 py-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex(i);
                  onIndexChange?.(i);
                }}
                className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                  i === index
                    ? "border-[#c9a84c] scale-110 shadow-lg shadow-[#c9a84c]/30"
                    : "border-white/20 hover:border-white/50 hover:scale-105"
                }`}
                aria-label={`Go to image ${i + 1}`}
                type="button">
                <img
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
