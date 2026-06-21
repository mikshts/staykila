// src/components/dashboard/QRDownload.jsx
import React, { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";

export default function QRDownload({ hotel, rooms, onClose }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const panelRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const downloadAllQRs = async () => {
    if (rooms.length === 0) {
      toast.error("No rooms to generate QR codes");
      return;
    }

    try {
      setLoading(true);
      setProgress(0);

      // Dynamically import JSZip
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folder = zip.folder(`${hotel.name.replace(/\s/g, "_")}_QRCodes`);

      const totalRooms = rooms.length;

      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        setProgress(((i + 1) / totalRooms) * 100);

        // Create a temporary div for QR code
        const div = document.createElement("div");
        div.style.cssText = "position:absolute;left:-9999px";
        document.body.appendChild(div);

        // src/components/dashboard/QRDownload.jsx
        // In the downloadAllQRs function, update the URL generation:

        const roomParam = `${hotel.id}_${room.id}`;
        const url = `${window.location.origin}/guest?room=${roomParam}&name=${encodeURIComponent(room.name)}`;
        // Generate QR code
        new window.QRCode(div, {
          text: url,
          width: 200,
          height: 200,
        });

        // Wait for QR to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        const canvas = div.querySelector("canvas");
        if (canvas) {
          const dataUrl = canvas.toDataURL("image/png");
          const base64Data = dataUrl.split(",")[1];
          folder.file(`${room.name.replace(/\s/g, "_")}.png`, base64Data, {
            base64: true,
          });
        }

        div.remove();
      }

      // Generate the ZIP file
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${hotel.name.replace(/\s/g, "_")}_QRCodes.zip`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Downloaded ${rooms.length} QR codes!`);
      onClose();
    } catch (error) {
      console.error("Error downloading QR codes:", error);
      toast.error("Failed to download QR codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={panelRef}
        className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
            <i className="fas fa-qrcode text-white text-2xl"></i>
          </div>
          <h3 className="text-xl font-bold text-[#0f1b2d]">
            Download All QR Codes
          </h3>
          <p className="text-sm text-[#8a8278] mt-1">
            Generate QR codes for all {rooms.length} rooms
          </p>
        </div>

        <div className="bg-[#f7f3ee] rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#8a8278]">Total Rooms</span>
            <span className="font-semibold text-[#0f1b2d]">{rooms.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8a8278]">File Format</span>
            <span className="font-semibold text-[#0f1b2d]">ZIP with PNGs</span>
          </div>
        </div>

        {loading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-[#8a8278] mb-1">
              <span>Generating...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-[#f7f3ee] rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-[#e5e2db] rounded-xl text-sm text-[#8a8278] hover:bg-[#f7f3ee] transition"
            disabled={loading}>
            Cancel
          </button>
          <button
            onClick={downloadAllQRs}
            disabled={loading || rooms.length === 0}
            className="flex-1 py-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                Download All
              </>
            )}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] text-[#8a8278]">
            <i className="fas fa-info-circle mr-1"></i>
            QR codes will be named after each room
          </p>
        </div>
      </div>
    </div>
  );
}
