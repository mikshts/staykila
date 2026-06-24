// src/hooks/useSoundAlert.js
import { useEffect, useRef, useCallback } from "react";
import { playExpiringAlert, playUrgentAlert } from "../utils/sound";

export const useSoundAlert = (rooms, getRoomStatus) => {
  const alertedRooms = useRef(new Set());
  const urgentAlertedRooms = useRef(new Set());
  const lastAlertTime = useRef({});
  const alertCooldown = 30000; // 30 seconds between alerts for same room

  const shouldAlert = useCallback((roomId) => {
    const now = Date.now();
    const lastTime = lastAlertTime.current[roomId] || 0;
    return now - lastTime > alertCooldown;
  }, []);

  useEffect(() => {
    const now = new Date();

    rooms.forEach((room) => {
      if (room.booking && room.booking.end_time) {
        const endTime = new Date(room.booking.end_time);
        const diff = endTime - now;
        const diffSeconds = diff / 1000;
        const roomId = room.id;

        // Normal expiring alert (10 seconds)
        if (
          diffSeconds <= 10 &&
          diffSeconds > 0 &&
          !alertedRooms.current.has(roomId)
        ) {
          if (shouldAlert(roomId)) {
            playExpiringAlert();
            alertedRooms.current.add(roomId);
            lastAlertTime.current[roomId] = Date.now();

            // Remove from set after a minute so it can alert again if needed
            setTimeout(() => {
              alertedRooms.current.delete(roomId);
            }, 60000);
          }
        }

        // Urgent alert (3 seconds - critical)
        if (
          diffSeconds <= 3 &&
          diffSeconds > 0 &&
          !urgentAlertedRooms.current.has(roomId)
        ) {
          if (shouldAlert(roomId)) {
            playUrgentAlert();
            urgentAlertedRooms.current.add(roomId);
            lastAlertTime.current[roomId] = Date.now();

            setTimeout(() => {
              urgentAlertedRooms.current.delete(roomId);
            }, 90000);
          }
        }

        // Reset alerts if room is no longer expiring (checked out or extended)
        if (diffSeconds > 15) {
          alertedRooms.current.delete(roomId);
          urgentAlertedRooms.current.delete(roomId);
        }
      }
    });
  }, [rooms, shouldAlert]);
};
