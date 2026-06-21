// src/components/modals/QRModal.jsx
import React, { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import QRCode from "qrcode"; // Import from npm package
import { buildGuestUrl } from "../../lib/guestUrl";

export default function QRModal({ room, onClose, hotelId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Guard: room/hotelId can be momentarily undefined if this modal is
    // opened and closed in quick succession, or if the parent panel
    // unmounts (clearing selectedRoom) while this is still mid-render.
    // Without this guard, buildGuestUrl(hotelId, room.id, room.name)
    // throws on `room.id` when room is undefined, which is the real
    // source of the "Cannot read properties of undefined" crash.
    if (!room || !hotelId) return;

    if (canvasRef.current) {
      const url = buildGuestUrl(hotelId, room.id, room.name);
      console.log("QR URL generated:", url);

      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 200,
          margin: 2,
          color: {
            dark: "#0f1b2d",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H", // High error correction for better scanning
        },
        function (error) {
          if (error) {
            console.error("QR generation error:", error);
            toast.error("Failed to generate QR code");
          }
        },
      );
    }
  }, [room, hotelId]);

  const downloadQR = () => {
    if (!room) {
      toast.error("QR code not ready");
      return;
    }
    const canvas = canvasRef.current;
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

  // Guard the render itself: if room hasn't arrived yet (or vanished
  // because the parent closed mid-mount), render nothing instead of
  // letting `room.name` below throw during render.
  if (!room) {
    return null;
  }

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
          <div className="flex justify-center my-4">
            <canvas ref={canvasRef}></canvas>
          </div>
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
