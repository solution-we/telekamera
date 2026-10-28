import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/auth";
import { assertSameOrigin, requestIp } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const session = await getAdminSession();
    const supabase = await createServerSupabase();
    await supabase.auth.signOut({ scope: "local" });
    if (session) await writeAudit({ adminUserId: session.id, action: "auth.logout", ip: requestIp(request) });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Could not end the session." }, { status: 500 });
  }
}
