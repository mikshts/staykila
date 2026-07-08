// src/hooks/useSubscription.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useHotel } from "../contexts/HotelContext";

export function useSubscription() {
  const { hotel } = useHotel();
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
        .maybeSingle(); // better than .single() to avoid error if none

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
