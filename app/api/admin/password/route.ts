import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { passwordChangeSchema } from "@/lib/validation";
import { parseJson } from "@/lib/api";
import { assertSameOrigin, requestIp } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const session = await requireAdmin({ allowPasswordChange: true });
    const { password } = await parseJson(request, passwordChangeSchema);
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return Response.json({ error: "The new password could not be saved." }, { status: 400 });
    const admin = createAdminSupabase();
    const { error: updateError } = await admin.from("admin_accounts").update({ must_change_password: false, password_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", session.id);
    if (updateError) return Response.json({ error: "Password changed, but account setup needs another attempt. Sign in again if prompted." }, { status: 503 });
    await writeAudit({ adminUserId: session.id, action: "auth.password_changed", ip: requestIp(request) });
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) await supabase.auth.signOut({ scope: "local" });
    return Response.json({ ok: true, sessionInvalidated: !signOutError });
  } catch (error) {
    return authErrorResponse(error);
  }
}
