import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnvironment } from "@/lib/config";

export function createAdminSupabase() {
  return createClient(requireEnvironment("SUPABASE_URL"), requireEnvironment("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
