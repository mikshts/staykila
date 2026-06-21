// src/components/modals/MenuModal.jsx
import React, { useState } from "react";

export default function MenuModal({ menuImages, onUpload, onRemove, onClose }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    setUploading(true);
    await onUpload(e);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-[#0f1b2d] text-lg mb-1">
          <i className="fas fa-utensils text-purple-500 mr-2"></i>Room Service
          Menu
        </h3>
        <p className="text-xs text-[#8a8278] mb-4">
          Upload up to 6 menu photos. Guests will see them in a gallery.
        </p>

        {menuImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {menuImages.map((img, idx) => (
              <div key={img.id} className="relative">
                <img
                  src={img.image_url}
                  alt={`Menu ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-[#e5e2db]"
                />
                <button
                  onClick={() => onRemove(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition">
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#f7f3ee] rounded-xl p-6 text-center text-[#8a8278] mb-4">
            <i className="fas fa-image text-3xl mb-2 block opacity-40"></i>
            <p className="text-sm">No menu images uploaded</p>
          </div>
        )}

        {menuImages.length < 6 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#0f1b2d] mb-1">
              Add new menu image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="w-full px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:border-[#c9a84c] outline-none file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[#0f1b2d] file:text-white file:text-sm file:rounded-lg hover:file:opacity-90 transition"
            />
            {uploading && (
              <div className="text-xs text-[#8a8278] mt-1">
                <i className="fas fa-spinner fa-spin mr-1"></i>Uploading...
              </div>
            )}
          </div>
        )}

        {menuImages.length >= 6 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm text-center mb-4">
            <i className="fas fa-info-circle mr-1"></i>
            Maximum 6 images reached.
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
          Close
        </button>
      </div>
    </div>
  );
}
