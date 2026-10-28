import { deliverRelease } from "@/lib/download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return deliverRelease("android");
}
