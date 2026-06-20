// src/components/dashboard/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user, hotel } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    available: 0,
    occupied: 0,
    expiring: 0,
    expired: 0,
    cleaning: 0,
  });

  useEffect(() => {
    if (hotel?.id) {
      fetchRooms();
    }
  }, [hotel]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("hotel_id", hotel.id)
        .order("room_number");

      if (error) throw error;

      setRooms(data || []);

      // Calculate stats
      const newStats = {
        available: 0,
        occupied: 0,
        expiring: 0,
        expired: 0,
        cleaning: 0,
      };
      data?.forEach((room) => {
        if (newStats[room.status] !== undefined) {
          newStats[room.status]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      toast.error("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🏨 Welcome to StayKila
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">
              {stats.available}
            </div>
            <div className="text-sm text-green-600">Available</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">
              {stats.occupied}
            </div>
            <div className="text-sm text-red-600">Occupied</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">
              {stats.expiring}
            </div>
            <div className="text-sm text-orange-600">Expiring</div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">
              {stats.expired}
            </div>
            <div className="text-sm text-gray-600">Expired</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">
              {stats.cleaning}
            </div>
            <div className="text-sm text-blue-600">Cleaning</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Rooms ({rooms.length})</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No rooms found. Create your first room!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="border rounded-lg p-4 hover:shadow-lg transition">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg">
                      {room.name || `Room ${room.room_number}`}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        room.status === "available"
                          ? "bg-green-100 text-green-700"
                          : room.status === "occupied"
                            ? "bg-red-100 text-red-700"
                            : room.status === "expiring"
                              ? "bg-orange-100 text-orange-700"
                              : room.status === "expired"
                                ? "bg-gray-100 text-gray-700"
                                : "bg-blue-100 text-blue-700"
                      }`}>
                      {room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Room #{room.room_number}
                  </p>
                  {room.notes && (
                    <p className="text-sm text-gray-600 mt-2">{room.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <p>User: {user?.email}</p>
          <p>Hotel: {hotel?.name}</p>
        </div>
      </div>
    </div>
  );
}
