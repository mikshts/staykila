// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import toast from "react-hot-toast";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchHotel(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setUser(session.user);
        await fetchHotel(session.user.id);
      } else {
        setUser(null);
        setHotel(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchHotel = async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("hotel_id, hotels(*)")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching hotel:", error);
      return;
    }

    setHotel(data.hotels);
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Welcome back!");
    return { data };
  };

  const register = async (email, password, hotelData) => {
    // Start a transaction: create auth user, then hotel, then user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: hotelData.owner,
        },
      },
    });

    if (authError) {
      toast.error(authError.message);
      return { error: authError };
    }

    // Create hotel
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .insert({
        name: hotelData.name,
        owner: hotelData.owner,
        email: email,
      })
      .select()
      .single();

    if (hotelError) {
      toast.error("Failed to create hotel");
      return { error: hotelError };
    }

    // Create user record
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      hotel_id: hotel.id,
      full_name: hotelData.owner,
      role: "admin",
    });

    if (userError) {
      toast.error("Failed to setup user");
      return { error: userError };
    }

    // Create rooms
    const rooms = [];
    for (let i = 1; i <= hotelData.rooms; i++) {
      rooms.push({
        hotel_id: hotel.id,
        room_number: i,
        name: `Room ${i}`,
        status: "available",
      });
    }

    const { error: roomsError } = await supabase.from("rooms").insert(rooms);

    if (roomsError) {
      toast.error("Failed to create rooms");
      return { error: roomsError };
    }

    // Create default pricing
    const pricing = [
      { hotel_id: hotel.id, duration_hours: 1, price: 100 },
      { hotel_id: hotel.id, duration_hours: 3, price: 250 },
      { hotel_id: hotel.id, duration_hours: 6, price: 450 },
      { hotel_id: hotel.id, duration_hours: 12, price: 800 },
      { hotel_id: hotel.id, duration_hours: 24, price: 1500 },
    ];

    const { error: pricingError } = await supabase
      .from("pricing")
      .insert(pricing);

    if (pricingError) {
      toast.error("Failed to setup pricing");
      return { error: pricingError };
    }

    toast.success("Hotel registered successfully!");
    return { data: authData };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setHotel(null);
    toast.success("Logged out");
  };

  const value = {
    user,
    hotel,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
