import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { pinChangeSchema } from "@/lib/validation";
import { parseJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const session = await requireAdmin();
    const { pin } = await parseJson(request, pinChangeSchema);
    const { error } = await createAdminSupabase().rpc("set_admin_pin", { p_new_pin: pin });
    if (error) return Response.json({ error: "The access code could not be saved." }, { status: 503 });
    await writeAudit({ adminUserId: session.id, action: "auth.pin_changed", metadata: { result: "accepted" } });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
