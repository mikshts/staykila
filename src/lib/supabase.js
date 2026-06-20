import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For admin operations (use sparingly)
export const supabaseAdmin = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
);
