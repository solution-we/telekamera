import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { getAdminReleases } from "@/lib/releases";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ releases: await getAdminReleases() });
  } catch (error) {
    return authErrorResponse(error);
  }
}
