import { deliverRelease } from "@/lib/download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const format = new URL(request.url).searchParams.get("format") || undefined;
  return deliverRelease("windows", undefined, format);
}
