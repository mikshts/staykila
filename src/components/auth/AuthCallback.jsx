// src/components/auth/AuthCallback.jsx
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
          // Check if user has a hotel
          const { data, error: userError } = await supabase
            .from("users")
            .select("hotel_id")
            .eq("id", session.user.id)
            .single();

          if (userError && userError.code !== "PGRST116") {
            // PGRST116 means no rows found, which is fine
            console.error("User lookup error:", userError);
          }

          if (!data || !data.hotel_id) {
            // User needs to set up a hotel
            toast.success("Welcome! Please set up your hotel.");
            navigate("/setup");
          } else {
            toast.success("Signed in successfully!");
            navigate("/");
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
