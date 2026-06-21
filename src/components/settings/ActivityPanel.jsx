// src/components/settings/ActivityPanel.jsx
import React, { useRef, useEffect } from "react";

export default function ActivityPanel({ logs, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-md h-full overflow-y-auto">
        <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Activity Log</div>
            <div className="text-xs text-white/50">Recent events</div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-[#8a8278]">
              <p className="text-sm">No activity yet</p>
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 py-3 border-b border-[#e5e2db]">
                <div className="w-8 h-8 bg-[#f7f3ee] rounded-lg flex items-center justify-center text-[#0f1b2d]">
                  <i className="fas fa-circle-dot text-xs"></i>
                </div>
                <div>
                  <div className="text-sm">{log.description}</div>
                  <div className="text-xs text-[#8a8278]">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
