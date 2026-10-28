import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnvironment } from "@/lib/config";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    requireEnvironment("SUPABASE_URL"),
    requireEnvironment("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server components cannot set cookies; proxy.ts refreshes sessions for requests.
          }
        },
      },
    },
  );
}
