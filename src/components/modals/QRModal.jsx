// src/components/modals/QRModal.jsx
import React, { useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function QRModal({ room, onClose, hotelId }) {
  const qrRef = useRef(null);

  useEffect(() => {
    if (qrRef.current && window.QRCode) {
      qrRef.current.innerHTML = "";

      // Build the URL WITHOUT encoding the room param (it's already safe)
      const baseUrl = window.location.origin;
      const roomParam = `${hotelId}_${room.id}`;
      const url = `${baseUrl}/guest?room=${roomParam}&name=${encodeURIComponent(room.name)}`;
      console.log("QR URL generated:", url);

      try {
        new window.QRCode(qrRef.current, {
          text: url,
          width: 200,
          height: 200,
        });
      } catch (error) {
        console.error("QR generation error:", error);
        toast.error("Failed to generate QR code");
      }
    }
  }, [room, hotelId]);

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (canvas) {
      try {
        const link = document.createElement("a");
        link.download = `${room.name.replace(/\s/g, "_")}_QR.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("QR code downloaded!");
      } catch (error) {
        console.error("Download error:", error);
        toast.error("Failed to download QR code");
      }
    } else {
      toast.error("QR code not ready");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#8a8278] mb-1">
            QR Code
          </div>
          <h3 className="font-bold text-[#0f1b2d] text-lg">{room.name}</h3>
          <p className="text-xs text-[#8a8278] mb-4">
            Scan to view room status
          </p>
          <div ref={qrRef} className="flex justify-center my-4"></div>
          <p className="text-[10px] text-[#8a8278] mt-2">
            Guests scan to see their stay information
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={downloadQR}
            className="flex-1 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
            <i className="fas fa-download"></i> Download PNG
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-[#e5e2db] rounded-lg text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
