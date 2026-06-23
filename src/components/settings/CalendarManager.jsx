//src/components/settings/CalendarManager.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function CalendarManager({ hotel, rooms, onClose }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [bookingSource, setBookingSource] = useState("agoda");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [roomBookings, setRoomBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);

  useEffect(() => {
    fetchAllBookings();
  }, []);

  const fetchAllBookings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          room_id,
          start_time,
          end_time,
          status,
          guest_name,
          notes
        `,
        )
        .eq("hotel_id", hotel.id)
        .in("status", ["active", "booked"]);

      if (error) throw error;

      const bookingsByRoom = {};
      data.forEach((booking) => {
        if (!bookingsByRoom[booking.room_id]) {
          bookingsByRoom[booking.room_id] = [];
        }
        // Check if this booking spans multiple days
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          // For multi-day bookings, create entries for each day
          for (let i = 0; i < diffDays; i++) {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            bookingsByRoom[booking.room_id].push({
              date: date.toDateString(),
              start: start,
              end: end,
              source: booking.guest_name?.includes("Agoda")
                ? "agoda"
                : booking.guest_name?.includes("Booking")
                  ? "booking"
                  : "walk-in",
              guest: booking.guest_name,
              id: booking.id,
              notes: booking.notes,
              isMultiDay: true,
            });
          }
        } else {
          bookingsByRoom[booking.room_id].push({
            date: start.toDateString(),
            start: start,
            end: end,
            source: booking.guest_name?.includes("Agoda")
              ? "agoda"
              : booking.guest_name?.includes("Booking")
                ? "booking"
                : "walk-in",
            guest: booking.guest_name,
            id: booking.id,
            notes: booking.notes,
            isMultiDay: false,
          });
        }
      });

      setRoomBookings(bookingsByRoom);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast.error("Failed to load calendar data");
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (!selectedRoomId) {
      toast.info("Please select a room first");
      return;
    }

    // Check if date is already booked
    const isBooked = isDateBooked(date, selectedRoomId);
    if (isBooked) {
      const booking = getBookingForDate(date, selectedRoomId);
      if (booking) {
        toast.error(
          `This date is already booked: ${booking.guest || "Unknown guest"}`,
        );
        return;
      }
    }

    setShowBookingModal(true);
  };
  // In CalendarManager.jsx - handleBlockDate function
  const handleBlockDate = async () => {
    if (!selectedRoomId) {
      toast.error("Please select a room");
      return;
    }

    try {
      const room = rooms.find((r) => r.id === selectedRoomId);
      if (!room) {
        toast.error("Room not found");
        return;
      }

      const startTime = new Date(selectedDate);
      startTime.setHours(0, 0, 0, 0);

      const endTime = new Date(selectedDate);
      endTime.setHours(23, 59, 59, 999);

      // Check if date is already booked
      const isBooked = isDateBooked(selectedDate, selectedRoomId);
      if (isBooked) {
        toast.error("This date is already booked!");
        return;
      }

      const sourceLabels = {
        agoda: "Agoda Booking",
        booking: "Booking.com Booking",
        "walk-in": "Walk-in Guest",
        maintenance: "Maintenance",
        other: "Other",
      };

      const guestName = sourceLabels[bookingSource] || "Booked";

      const bookingData = {
        room_id: selectedRoomId,
        hotel_id: hotel.id,
        guest_name: guestName,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        hours: 24,
        price: 0,
        status: "booked",
        booking_source: bookingSource,
        booking_type:
          bookingSource === "agoda" || bookingSource === "booking"
            ? "ota"
            : "walk-in",
        notes:
          notes || `Blocked via calendar on ${new Date().toLocaleDateString()}`,
      };

      const { data, error } = await supabase
        .from("bookings")
        .insert([bookingData])
        .select();

      if (error) {
        console.error("Supabase error:", error);
        toast.error(`Failed to block date: ${error.message}`);
        return;
      }

      toast.success(
        `✅ ${room.name} booked for ${selectedDate.toLocaleDateString()}`,
      );

      await fetchAllBookings();
      setShowBookingModal(false);
      setNotes("");
      setBookingSource("agoda");
    } catch (error) {
      console.error("Error blocking date:", error);
      toast.error("Failed to block date");
    }
  };
  const handleRemoveBooking = async (bookingId) => {
    if (!confirm("Remove this booking from the calendar?")) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking removed from calendar");
      await fetchAllBookings();
    } catch (error) {
      console.error("Error removing booking:", error);
      toast.error("Failed to remove booking");
    }
  };

  const isDateBooked = (date, roomId) => {
    const bookings = roomBookings[roomId] || [];
    const dateStr = date.toDateString();
    return bookings.some((booking) => booking.date === dateStr);
  };

  const getBookingForDate = (date, roomId) => {
    const bookings = roomBookings[roomId] || [];
    const dateStr = date.toDateString();
    return bookings.find((booking) => booking.date === dateStr);
  };

  const getSourceColor = (source) => {
    const colors = {
      agoda: "bg-blue-100 text-blue-700 border-blue-200",
      booking: "bg-purple-100 text-purple-700 border-purple-200",
      "walk-in": "bg-green-100 text-green-700 border-green-200",
      maintenance: "bg-orange-100 text-orange-700 border-orange-200",
      other: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[source] || colors["other"];
  };

  const getSourceIcon = (source) => {
    const icons = {
      agoda: "🏨",
      booking: "🛏️",
      "walk-in": "🚶",
      maintenance: "🔧",
      other: "📋",
    };
    return icons[source] || icons["other"];
  };

  const getSourceLabel = (source) => {
    const labels = {
      agoda: "Agoda",
      booking: "Booking.com",
      "walk-in": "Walk-in",
      maintenance: "Maintenance",
      other: "Other",
    };
    return labels[source] || source;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get booked dates count for a room
  const getBookedDatesCount = (roomId) => {
    return (roomBookings[roomId] || []).length;
  };

  // Get room status color
  const getRoomStatusColor = (roomId) => {
    const count = getBookedDatesCount(roomId);
    if (count === 0) return "border-green-300 bg-green-50";
    if (count < 5) return "border-yellow-300 bg-yellow-50";
    return "border-red-300 bg-red-50";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <div className="bg-white w-full max-w-4xl h-full p-6 animate-slide-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[#0f1b2d]">
              Calendar Manager
            </h2>
            <button
              onClick={onClose}
              className="text-[#8a8278] hover:text-[#0f1b2d]">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f1b2d]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-white w-full max-w-5xl h-full overflow-y-auto p-6 animate-slide-in">
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b border-[#e5e2db] z-10">
          <div>
            <h2 className="text-xl font-bold text-[#0f1b2d]">
              <i className="fas fa-calendar-alt mr-2"></i>
              Calendar Manager
            </h2>
            <p className="text-sm text-[#8a8278] mt-1">
              Select a room, then click any date to block it for OTA bookings or
              maintenance
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#8a8278] hover:text-[#0f1b2d]">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Room List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0f1b2d]">Your Rooms</h3>
              <span className="text-xs text-[#8a8278]">
                {rooms.filter((r) => getBookedDatesCount(r.id) > 0).length}/
                {rooms.length} busy
              </span>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {rooms.map((room) => {
                const bookedCount = getBookedDatesCount(room.id);
                const isSelected = selectedRoomId === room.id;

                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-lg border-2 transition cursor-pointer ${
                      isSelected
                        ? "border-[#0f1b2d] bg-[#f7f3ee] shadow-sm"
                        : "border-[#e5e2db] hover:border-[#0f1b2d] hover:bg-[#fafafa]"
                    } ${getRoomStatusColor(room.id)}`}
                    onClick={() => setSelectedRoomId(room.id)}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-[#0f1b2d]">
                          {room.name || `Room ${room.room_number}`}
                        </h4>
                        <div className="text-xs text-[#8a8278] mt-0.5">
                          {bookedCount > 0 ? (
                            <span className="text-red-600">
                              🔴 {bookedCount} date{bookedCount > 1 ? "s" : ""}{" "}
                              booked
                            </span>
                          ) : (
                            <span className="text-green-600">
                              ✅ All available
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="text-[#0f1b2d]">
                          <i className="fas fa-check-circle"></i>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 bg-[#f7f3ee] rounded-lg">
              <h4 className="text-sm font-semibold text-[#0f1b2d] mb-2">
                Booking Sources
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span>Agoda</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span>Booking.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span>Walk-in</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span>Maintenance</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-3 p-3 bg-white border border-[#e5e2db] rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#8a8278]">Total Rooms:</span>
                  <span className="ml-1 font-bold text-[#0f1b2d]">
                    {rooms.length}
                  </span>
                </div>
                <div>
                  <span className="text-[#8a8278]">Booked Dates:</span>
                  <span className="ml-1 font-bold text-[#0f1b2d]">
                    {rooms.reduce(
                      (sum, r) => sum + getBookedDatesCount(r.id),
                      0,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Calendar */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0f1b2d]">
                {selectedRoomId
                  ? `📅 ${rooms.find((r) => r.id === selectedRoomId)?.name || "Selected Room"}`
                  : "👈 Select a room to manage its calendar"}
              </h3>
              {selectedRoomId && (
                <button
                  onClick={() => {
                    const room = rooms.find((r) => r.id === selectedRoomId);
                    if (
                      room &&
                      confirm(`Clear all bookings for ${room.name}?`)
                    ) {
                      // Implementation to clear all bookings for this room
                      toast.info("Clear all feature coming soon");
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-800">
                  <i className="fas fa-trash mr-1"></i> Clear All
                </button>
              )}
            </div>

            {selectedRoomId ? (
              <>
                <div className="bg-white border border-[#e5e2db] rounded-lg p-4">
                  <Calendar
                    value={selectedDate}
                    onChange={setSelectedDate}
                    tileClassName={({ date, view }) => {
                      if (view === "month" && selectedRoomId) {
                        const booked = isDateBooked(date, selectedRoomId);
                        if (booked) {
                          const booking = getBookingForDate(
                            date,
                            selectedRoomId,
                          );
                          return `booked-date ${getSourceColor(booking?.source)}`;
                        }
                        return "available-date";
                      }
                      return "";
                    }}
                    tileContent={({ date, view }) => {
                      if (view === "month" && selectedRoomId) {
                        const booking = getBookingForDate(date, selectedRoomId);
                        if (booking) {
                          return (
                            <div className="text-[8px] mt-0.5 font-bold">
                              {getSourceIcon(booking.source)}
                            </div>
                          );
                        }
                      }
                      return null;
                    }}
                    onClickDay={(date) => handleDateClick(date)}
                  />
                </div>

                {/* Selected Date Info */}
                <div className="mt-4 flex items-center justify-between bg-[#f7f3ee] rounded-lg p-3">
                  <div>
                    <span className="text-sm text-[#8a8278]">Selected:</span>
                    <span className="ml-2 font-semibold text-[#0f1b2d]">
                      {formatDate(selectedDate)}
                    </span>
                    {isDateBooked(selectedDate, selectedRoomId) && (
                      <span className="ml-2 text-xs text-red-600">
                        ⚠️ Already booked
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (isDateBooked(selectedDate, selectedRoomId)) {
                        toast.error("This date is already booked");
                        return;
                      }
                      setShowBookingModal(true);
                    }}
                    disabled={isDateBooked(selectedDate, selectedRoomId)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      isDateBooked(selectedDate, selectedRoomId)
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-[#0f1b2d] text-white hover:bg-[#1a2d44]"
                    }`}>
                    <i className="fas fa-plus mr-2"></i>
                    Block This Date
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-[#e5e2db] rounded-lg p-12 text-center">
                <i className="fas fa-calendar-plus text-4xl text-[#8a8278] mb-3 block"></i>
                <p className="text-[#8a8278]">
                  Select a room from the left to view its calendar
                </p>
                <p className="text-xs text-[#8a8278] mt-1">
                  You can then click any date to block it
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Booking Modal */}
        {showBookingModal && selectedRoomId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0f1b2d]">
                    Block Date
                  </h3>
                  <p className="text-sm text-[#8a8278]">
                    {formatDate(selectedDate)} •{" "}
                    {rooms.find((r) => r.id === selectedRoomId)?.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-[#8a8278] hover:text-[#0f1b2d]">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#8a8278] mb-2">
                    Booking Source
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "agoda", label: "🏨 Agoda" },
                      { value: "booking", label: "🛏️ Booking.com" },
                      { value: "walk-in", label: "🚶 Walk-in" },
                      { value: "maintenance", label: "🔧 Maintenance" },
                      { value: "other", label: "📋 Other" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        className={`px-3 py-2 border rounded-lg text-sm transition ${
                          bookingSource === option.value
                            ? "border-[#0f1b2d] bg-[#f7f3ee] text-[#0f1b2d] font-medium"
                            : "border-[#e5e2db] hover:border-[#0f1b2d]"
                        }`}
                        onClick={() => setBookingSource(option.value)}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#8a8278] mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e5e2db] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1b2d]"
                    rows="2"
                    placeholder="Add any notes about this booking..."></textarea>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="flex-1 px-4 py-2 border border-[#e5e2db] rounded-lg text-sm font-medium hover:bg-[#f7f3ee] transition">
                    Cancel
                  </button>
                  <button
                    onClick={handleBlockDate}
                    className="flex-1 px-4 py-2 bg-[#0f1b2d] text-white rounded-lg text-sm font-medium hover:bg-[#1a2d44] transition">
                    Block Date
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Style for calendar tiles */}
        <style>{`
          .react-calendar {
            border: none;
            font-family: inherit;
            width: 100%;
          }
          .react-calendar__navigation {
            margin-bottom: 0.5rem;
          }
          .react-calendar__navigation button {
            color: #0f1b2d;
            font-weight: 600;
            font-size: 0.9rem;
          }
          .react-calendar__month-view__weekdays {
            color: #8a8278;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.7rem;
          }
          .react-calendar__tile {
            height: 60px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
          }
          .react-calendar__tile:enabled:hover {
            background-color: #f7f3ee;
            transform: scale(1.05);
          }
          .react-calendar__tile--active {
            background: #0f1b2d !important;
            color: white !important;
          }
          .react-calendar__tile--active:enabled:hover {
            background: #1a2d44 !important;
          }
          .booked-date {
            font-weight: bold;
            border: 2px solid transparent;
            position: relative;
          }
          .booked-date::after {
            content: '';
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: currentColor;
          }
          .booked-date.bg-blue-100 {
            background-color: #dbeafe !important;
            color: #1e40af;
          }
          .booked-date.bg-purple-100 {
            background-color: #ede9fe !important;
            color: #6d28d9;
          }
          .booked-date.bg-green-100 {
            background-color: #d1fae5 !important;
            color: #065f46;
          }
          .booked-date.bg-orange-100 {
            background-color: #fed7aa !important;
            color: #9a3412;
          }
          .booked-date.bg-gray-100 {
            background-color: #f3f4f6 !important;
            color: #4b5563;
          }
          .booked-date:hover {
            filter: brightness(0.95);
          }
          .available-date {
            background-color: #f0fdf4 !important;
          }
          .available-date:hover {
            background-color: #d1fae5 !important;
          }
          .react-calendar__tile:disabled {
            background-color: #f3f4f6 !important;
            color: #9ca3af !important;
          }
        `}</style>
      </div>
    </div>
  );
}
