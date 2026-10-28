import { deliverRelease } from "@/lib/download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ releaseId: string }> }) {
  const { releaseId } = await context.params;
  const format = new URL(request.url).searchParams.get("format") || undefined;
  return deliverRelease("windows", releaseId, format);
}
