import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseJson } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { assertSameOrigin, loginBucketKey, requestIp } from "@/lib/security";
import { writeAudit } from "@/lib/audit";
import { missingBackendEnvironment } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  const missingEnvironment = missingBackendEnvironment();
  if (missingEnvironment.length) {
    return Response.json({ error: `Administrator sign-in is not configured. Missing: ${missingEnvironment.join(", ")}.` }, { status: 503 });
  }
  try {
    const input = await parseJson(request, loginSchema);
    const email = input.email.trim().toLowerCase();
    const ip = requestIp(request);
    const emailBucket = loginBucketKey("email", email);
    const ipBucket = loginBucketKey("ip", ip);
    const admin = createAdminSupabase();
    const [accountLimit, addressLimit] = await Promise.all([
      admin.rpc("consume_login_attempt", { p_bucket_key: emailBucket, p_max_attempts: 8, p_window_seconds: 900, p_lockout_seconds: 600 }),
      admin.rpc("consume_login_attempt", { p_bucket_key: ipBucket, p_max_attempts: 30, p_window_seconds: 900, p_lockout_seconds: 600 }),
    ]);
    if (accountLimit.error || addressLimit.error) return Response.json({ error: "Administrator sign-in is temporarily unavailable." }, { status: 503 });
    if (accountLimit.data !== true || addressLimit.data !== true) {
      await writeAudit({ action: "auth.login_throttled", ip, metadata: { result: "rate_limited" } });
      return Response.json({ error: "Unable to sign in. Check your details or try again later." }, { status: 429 });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
    if (error || !data.user || data.user.app_metadata?.role !== "admin") {
      if (data.user) await supabase.auth.signOut();
      await writeAudit({ action: "auth.login_failed", ip, metadata: { result: "rejected" } });
      return Response.json({ error: "Unable to sign in. Check your details or try again later." }, { status: 401 });
    }

    const { data: account } = await admin.from("admin_accounts").select("status,must_change_password")
      .eq("user_id", data.user.id).maybeSingle();
    if (!account || account.status !== "active") {
      await supabase.auth.signOut();
      await writeAudit({ action: "auth.login_failed", ip, metadata: { result: "rejected" } });
      return Response.json({ error: "Unable to sign in. Check your details or try again later." }, { status: 401 });
    }

    await Promise.all([
      admin.rpc("reset_login_attempts", { p_bucket_key: emailBucket }),
      admin.rpc("reset_login_attempts", { p_bucket_key: ipBucket }),
    ]);
    await admin.from("admin_accounts").update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", data.user.id);
    await writeAudit({ adminUserId: data.user.id, action: "auth.login_success", ip, metadata: { result: "accepted" } });
    return Response.json({ ok: true, mustChangePassword: account.must_change_password });
  } catch (error) {
    if (error instanceof Error && error.message.includes("required server environment")) {
      return Response.json({ error: "Administrator sign-in is not configured." }, { status: 503 });
    }
    return Response.json({ error: error instanceof Error ? error.message : "Unable to sign in." }, { status: 400 });
  }
}
