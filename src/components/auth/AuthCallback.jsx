import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          toast.error("Authentication failed");
          navigate("/login");
          return;
        }

        if (session) {
          // 1. Check if user has a hotel_id in users table
          let { data: userData, error: userError } = await supabase
            .from("users")
            .select("hotel_id")
            .eq("id", session.user.id)
            .single();

          let hotelId = userData?.hotel_id;

          // 2. If no hotel_id, try to find a hotel with this email
          if (!hotelId) {
            const { data: hotelData } = await supabase
              .from("hotels")
              .select("id")
              .eq("email", session.user.email)
              .maybeSingle();

            if (hotelData) {
              // Link user to existing hotel
              const { error: linkError } = await supabase
                .from("users")
                .update({ hotel_id: hotelData.id })
                .eq("id", session.user.id);
              if (!linkError) {
                hotelId = hotelData.id;
              }
            }
          }

          // 3. If we have a hotel, go to dashboard
          if (hotelId) {
            toast.success("Signed in successfully!");
            navigate("/");
          } else {
            // Otherwise, send to hotel setup
            const preferredRooms =
              sessionStorage.getItem("preferredRooms") || 10;
            sessionStorage.removeItem("preferredRooms");
            toast.success("Welcome! Please set up your hotel.");
            navigate(`/setup?rooms=${preferredRooms}`);
          }
        } else {
          toast.error("No session found. Please try again.");
          navigate("/login");
        }
      } catch (err) {
        console.error("Callback error:", err);
        toast.error("Something went wrong");
        navigate("/login");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1b2d]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c9a84c] mx-auto"></div>
        <p className="text-white mt-4">Completing sign in...</p>
      </div>
    </div>
  );
}
