// src/hooks/usePayments.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

export function usePayments() {
  const { hotel } = useAuth();
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!hotel?.id) {
      setIsLoading(false);
      return;
    }

    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("hotel_id", hotel.id)
        .order("created_at", { ascending: false });

      if (!error) setPayments(data || []);
      setIsLoading(false);
    };

    fetchPayments();
  }, [hotel]);

  return { payments, isLoading };
}
