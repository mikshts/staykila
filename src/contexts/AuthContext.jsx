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
    try {
      // Step 1: Get hotel_id
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("hotel_id")
        .eq("id", userId)
        .single();

      if (userError) {
        if (userError.code === "PGRST116") {
          setHotel(null);
          return;
        }
        console.error("User fetch error:", userError);
        return;
      }

      if (!userData?.hotel_id) {
        setHotel(null);
        return;
      }

      // Step 2: Get hotel
      const { data: hotelData, error: hotelError } = await supabase
        .from("hotels")
        .select("*")
        .eq("id", userData.hotel_id)
        .single();

      if (hotelError) {
        console.error("Hotel fetch error:", hotelError);
        setHotel(null);
        return;
      }

      setHotel(hotelData);
    } catch (error) {
      console.error("fetchHotel error:", error);
    }
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
    try {
      // 1. Create auth user
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
        console.error("Auth error:", authError);
        toast.error(authError.message);
        return { error: authError };
      }

      if (!authData.user) {
        toast.error("Failed to create user account");
        return { error: new Error("No user created") };
      }

      // 2. Create hotel with proper fields
      const hotelPayload = {
        name: hotelData.name,
        owner: hotelData.owner,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating hotel with payload:", hotelPayload);

      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .insert([hotelPayload])
        .select()
        .single();

      if (hotelError) {
        console.error("Hotel creation error:", hotelError);
        toast.error(`Failed to create hotel: ${hotelError.message}`);
        return { error: hotelError };
      }

      console.log("Hotel created:", hotel);

      // 3. Create user record with hotel_id
      const userPayload = {
        id: authData.user.id,
        hotel_id: hotel.id,
        full_name: hotelData.owner,
        role: "admin",
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Creating user record with payload:", userPayload);

      const { error: userError } = await supabase
        .from("users")
        .insert([userPayload]);

      if (userError) {
        console.error("User record creation error:", userError);
        // Try to delete the hotel if user creation fails
        await supabase.from("hotels").delete().eq("id", hotel.id);
        toast.error(`Failed to setup user: ${userError.message}`);
        return { error: userError };
      }

      // 4. Create rooms
      const rooms = [];
      const numRooms = Math.min(hotelData.rooms || 10, 300);

      for (let i = 1; i <= numRooms; i++) {
        rooms.push({
          hotel_id: hotel.id,
          room_number: i,
          name: `Room ${i}`,
          status: "available",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      console.log(`Creating ${rooms.length} rooms`);

      if (rooms.length > 0) {
        const { error: roomsError } = await supabase
          .from("rooms")
          .insert(rooms);

        if (roomsError) {
          console.error("Room creation error:", roomsError);
          // Continue anyway, rooms can be created later
          toast.warning("Rooms created partially. You can add more later.");
        }
      }

      // 5. Create default pricing
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
        console.error("Pricing creation error:", pricingError);
        // Continue anyway, pricing can be added later
        toast.warning(
          "Default pricing created partially. You can update later.",
        );
      }

      toast.success("Hotel registered successfully!");
      return { data: authData };
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register hotel");
      return { error };
    }
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
