// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Single client instance - NO extra clients
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Only create admin client if absolutely needed
// Remove this if not using admin operations
// export const supabaseAdmin = createClient(
//   supabaseUrl,
//   import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
// );
