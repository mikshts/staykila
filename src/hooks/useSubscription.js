// src/hooks/useSubscription.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext"; // ← changed from useHotel/HotelContext

export function useSubscription() {
  const { hotel } = useAuth(); // ← real, populated hotel
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hotel?.id) {
      setIsLoading(false);
      return;
    }
    const fetchSubscription = async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("hotel_id", hotel.id)
        .maybeSingle();

      if (error) {
        console.error("Subscription fetch error:", error);
      }
      setSubscription(data || null);
      setIsLoading(false);
    };
    fetchSubscription();
  }, [hotel]);

  return { subscription, isLoading };
}
