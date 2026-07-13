// src/components/settings/MessagesPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { messageService } from "../../services/messageService";

export default function MessagesPanel({ rooms, hotelId, onClose, onOpenChat }) {
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    const fetchAllMessages = async () => {
      setLoading(true);
      const roomIds = rooms.map((r) => r.id);
      if (roomIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const uniqueMessages = [];
        const seenIds = new Set();
        data.forEach((msg) => {
          if (!seenIds.has(msg.id)) {
            seenIds.add(msg.id);
            uniqueMessages.push(msg);
          }
        });
        setAllMessages(uniqueMessages);
      }
      setLoading(false);
    };
    fetchAllMessages();
  }, [rooms]);

  // Live updates: subscribe to the hotel's messages so the panel reflects new
  // guest/admin messages and read-state changes without a manual refresh.
  useEffect(() => {
    if (!hotelId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = messageService.subscribeToHotel(hotelId, {
      onChange: (row, eventType) => {
        if (!row?.id) return;
        setAllMessages((prev) => {
          if (eventType === "UPDATE") {
            return prev.map((m) => (m.id === row.id ? row : m));
          }
          if (prev.some((m) => m.id === row.id)) return prev;
          return [row, ...prev];
        });
      },
      onDelete: (oldRow) => {
        if (!oldRow?.id) return;
        setAllMessages((prev) => prev.filter((m) => m.id !== oldRow.id));
      },
    });
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [hotelId]);

  // Handle click outside to close
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

  const groupedMessages = allMessages.reduce((acc, msg) => {
    const roomId = msg.room_id;
    if (!acc[roomId]) acc[roomId] = [];
    acc[roomId].push(msg);
    return acc;
  }, {});

  const handleOpenChat = (roomId) => {
    // Find room by ID - convert both to string for comparison
    const room = rooms.find((r) => String(r.id) === String(roomId));
    if (room) {
      onOpenChat(room);
    } else {
      console.error(
        "Room not found for ID:",
        roomId,
        "Available rooms:",
        rooms,
      );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-md h-full overflow-y-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-md h-full overflow-y-auto">
        <div className="sticky top-0 bg-[#0f1b2d] text-white p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Guest Messages</div>
            <div className="text-xs text-white/50">
              {allMessages.length} total messages
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-4">
          {Object.keys(groupedMessages).length === 0 ? (
            <div className="text-center py-8 text-[#8a8278]">
              <p className="text-sm">No guest messages yet</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([roomId, msgs]) => {
              // Find room by ID - convert both to string for comparison
              const room = rooms.find((r) => String(r.id) === String(roomId));
              const roomName = room?.name || `Room ${roomId}`;
              const unread = msgs.filter(
                (m) => !m.is_read && m.sender === "guest",
              ).length;

              return (
                <div
                  key={roomId}
                  className="mb-4 border border-[#e5e2db] rounded-xl overflow-hidden">
                  <div className="p-3 bg-[#f7f3ee] flex justify-between items-center border-b border-[#e5e2db]">
                    <span className="font-medium text-sm">{roomName}</span>
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unread} new
                      </span>
                    )}
                  </div>
                  <div className="p-3 max-h-48 overflow-y-auto">
                    {msgs.slice(0, 5).map((msg) => (
                      <div
                        key={msg.id}
                        className="py-1 border-b border-[#e5e2db] text-xs flex justify-between">
                        <span>
                          {msg.sender === "admin" ? "🛎️ Admin" : "👤 Guest"}:
                          <span
                            className={
                              !msg.is_read && msg.sender === "guest"
                                ? "font-bold"
                                : ""
                            }>
                            {msg.message}
                          </span>
                        </span>
                        <span className="text-[#8a8278]">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {msgs.length > 5 && (
                      <div className="text-xs text-[#8a8278] text-center py-1">
                        +{msgs.length - 5} more messages
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-[#fafafa] border-t border-[#e5e2db]">
                    <button
                      onClick={() => handleOpenChat(roomId)}
                      className="w-full py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                      <i className="fas fa-reply mr-1"></i>Open Chat
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
