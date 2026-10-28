import "server-only";
import { getDownloadRelease } from "@/lib/releases";
import { createDownloadUrl } from "@/lib/storage";
import { safeContentDisposition } from "@/lib/file-utils";

type Platform = "android" | "windows";

function errorResponse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function deliverRelease(platform: Platform, releaseId?: string, requestedFormat?: string) {
  const release = await getDownloadRelease(platform, releaseId);
  if (!release) return errorResponse(404, "That published TeleKamera release is not available.");
  if (!releaseId && release.channel !== "stable") return errorResponse(404, "No stable release is currently available.");

  const formats = platform === "android" ? ["apk"] : requestedFormat ? [requestedFormat] : ["exe", "msi"];
  const binary = release.binaries.find((item) => formats.includes(item.installer_format));
  if (!binary) return errorResponse(404, "That installer format is not available for this release.");
  try {
    const url = await createDownloadUrl(binary.storage_key, binary.content_type, safeContentDisposition(binary.original_filename));
    return new Response(null, { status: 302, headers: { Location: url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    return errorResponse(503, "The release file is temporarily unavailable. Please try again later.");
  }
}
