// src/components/settings/MessagesPanel.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function MessagesPanel({
  messages,
  rooms,
  onClose,
  onOpenChat,
}) {
  const [allMessages, setAllMessages] = useState([]);

  useEffect(() => {
    const fetchAllMessages = async () => {
      const roomIds = rooms.map((r) => r.id);
      if (roomIds.length === 0) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Deduplicate messages by ID
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
    };
    fetchAllMessages();
  }, [rooms]);

  const groupedMessages = allMessages.reduce((acc, msg) => {
    const roomId = msg.room_id;
    if (!acc[roomId]) acc[roomId] = [];
    acc[roomId].push(msg);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto">
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
              const room = rooms.find((r) => r.id === parseInt(roomId));
              const roomName = room?.name || "Unknown Room";
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
                      onClick={() => {
                        const room = rooms.find(
                          (r) => r.id === parseInt(roomId),
                        );
                        if (room) {
                          onOpenChat(room);
                        }
                      }}
                      className="w-full py-1.5 bg-[#0f1b2d] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition">
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
