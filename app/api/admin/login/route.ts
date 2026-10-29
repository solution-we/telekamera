import { createAdminSupabase } from "@/lib/supabase/admin";
import { parseJson } from "@/lib/api";
import { pinLoginSchema } from "@/lib/validation";
import { assertSameOrigin, loginBucketKey, requestIp } from "@/lib/security";
import { writeAudit } from "@/lib/audit";
import { missingBackendEnvironment } from "@/lib/config";
import { setAdminSessionCookie } from "@/lib/admin-session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  const missingEnvironment = missingBackendEnvironment();
  if (missingEnvironment.length) {
    return Response.json({ error: `Administrator sign-in is not configured. Missing: ${missingEnvironment.join(", ")}.` }, { status: 503 });
  }
  try {
    const input = await parseJson(request, pinLoginSchema);
    const ip = requestIp(request);
    const bucketKey = loginBucketKey("pin", ip);
    const admin = createAdminSupabase();
    const { data, error } = await admin.rpc("verify_admin_pin", {
      p_bucket_key: bucketKey,
      p_candidate_pin: input.pin,
      p_initial_pin: process.env.ADMIN_NUMERIC_CODE || null,
    });
    if (error) {
      const code = error.code || "UNKNOWN";
      console.error("PIN verification RPC failed", {
        code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const message = code === "PGRST202" || code === "42883"
        ? `Supabase cannot find the PIN verification function (${code}). Run migration 003, then reload the schema.`
        : code === "42501"
          ? `Supabase denied access to the PIN verification function (${code}). Re-run migration 003.`
          : code === "PGRST301" || code === "PGRST302"
            ? `Supabase rejected the server API key (${code}). Check SUPABASE_SERVICE_ROLE_KEY in Vercel.`
            : code === "42P01"
              ? `A required database table is missing (${code}). Apply migrations 001 through 003 in order.`
              : `Access verification is temporarily unavailable (Supabase error ${code}).`;
      return Response.json({ error: message }, { status: 503 });
    }
    const verification = data as { ok?: boolean; locked?: boolean; unavailable?: boolean; attempts_remaining?: number } | null;
    if (verification?.unavailable) return Response.json({ error: "The access code is not configured yet." }, { status: 503 });
    if (verification?.ok !== true) {
      const locked = verification?.locked === true;
      await writeAudit({
        action: locked ? "auth.pin_locked" : "auth.pin_failed",
        ip,
        metadata: { result: "rejected", suspicious: true, locked, attempts_remaining: verification?.attempts_remaining ?? 0 },
      });
      return Response.json(
        { error: locked ? "Admin access is locked for 30 minutes." : "Enter 12 digits and try again." },
        { status: locked ? 429 : 401 },
      );
    }

    const { data: account, error: accountError } = await admin.from("admin_accounts")
      .select("user_id")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (accountError || !account) return Response.json({ error: "The administrator profile is not configured." }, { status: 503 });
    await admin.from("admin_accounts").update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", account.user_id);
    await writeAudit({ adminUserId: account.user_id, action: "auth.pin_login_success", ip, metadata: { result: "accepted" } });
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response, account.user_id);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.includes("required server environment")) {
      return Response.json({ error: "Access verification is not configured." }, { status: 503 });
    }
    return Response.json({ error: "Unable to verify the access code." }, { status: 500 });
  }
}
