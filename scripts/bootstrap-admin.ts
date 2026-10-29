import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: existingProfile, error: profileError } = await supabase
    .from("admin_accounts").select("user_id").eq("status", "active").limit(1).maybeSingle();
  if (profileError) throw new Error("Could not check administrator bootstrap state; apply database migrations first.");
  if (existingProfile) {
    console.log("Administrator profile is already initialized. No account was changed.");
    return;
  }

  const userId = randomUUID();
  const { error: insertError } = await supabase.from("admin_accounts").insert({
    user_id: userId,
    status: "active",
  });
  if (insertError) throw new Error("Could not initialize the administrator profile. Apply all database migrations first.");

  console.log("Administrator profile initialized. Website access uses the numeric code; no Supabase Auth account is used.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Administrator bootstrap failed.");
  process.exitCode = 1;
});
