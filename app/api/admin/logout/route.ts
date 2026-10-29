import { getAdminSession } from "@/lib/auth";
import { assertSameOrigin, requestIp } from "@/lib/security";
import { writeAudit } from "@/lib/audit";
import { clearAdminSessionCookie } from "@/lib/admin-session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const session = await getAdminSession();
    if (session) await writeAudit({ adminUserId: session.id, action: "auth.logout", ip: requestIp(request) });
    const response = NextResponse.json({ ok: true });
    clearAdminSessionCookie(response);
    return response;
  } catch {
    return Response.json({ error: "Could not end the session." }, { status: 500 });
  }
}
