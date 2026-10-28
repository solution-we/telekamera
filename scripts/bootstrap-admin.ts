import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!url || !key || !email || !password) {
    throw new Error("Set Supabase server credentials and one-time administrator bootstrap secrets first.");
  }
  if (password.length < 14) throw new Error("The one-time bootstrap password must be at least 14 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("The bootstrap email address is invalid.");

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: existingProfile, error: profileError } = await supabase
    .from("admin_accounts").select("user_id").eq("email_normalized", email).maybeSingle();
  if (profileError) throw new Error("Could not check administrator bootstrap state; apply database migrations first.");
  if (existingProfile) {
    console.log("Administrator bootstrap has already completed. No account was changed.");
    return;
  }

  const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw new Error("Could not inspect existing authentication accounts.");
  const found = users.users.find((user) => user.email?.toLowerCase() === email);
  let userId = found?.id;
  let createdHere = false;

  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, { app_metadata: { ...found.app_metadata, role: "admin" } });
    if (error) throw new Error("Could not assign administrator access to the bootstrap account.");
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: "admin" },
    });
    if (error || !data.user) throw new Error("Could not create the initial administrator account.");
    userId = data.user.id;
    createdHere = true;
  }

  const { error: insertError } = await supabase.from("admin_accounts").insert({
    user_id: userId,
    email_normalized: email,
    status: "active",
    must_change_password: true,
  });
  if (insertError) {
    if (createdHere && userId) await supabase.auth.admin.deleteUser(userId);
    throw new Error("Could not finalize the administrator profile. Review the database state before retrying.");
  }

  console.log("Administrator bootstrap completed. The first login must set a new password.");
  console.log("Remove ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD from the environment now.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Administrator bootstrap failed.");
  process.exitCode = 1;
});
