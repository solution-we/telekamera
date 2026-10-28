import { randomUUID } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { uploadInitiateSchema, releaseFilename } from "@/lib/validation";
import { parseJson } from "@/lib/api";
import { assertSameOrigin, requestIp } from "@/lib/security";
import { contentTypeFor, createUploadUrl } from "@/lib/storage";
import { maxUploadBytes } from "@/lib/config";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const adminSession = await requireAdmin();
    const input = await parseJson(request, uploadInitiateSchema);
    if (input.fileSize > maxUploadBytes()) {
      return Response.json({ error: "The selected file exceeds the configured upload limit." }, { status: 413 });
    }
    const expectedExtension = `.${input.installerFormat}`;
    if (!input.filename.toLowerCase().endsWith(expectedExtension)) {
      return Response.json({ error: `Choose a ${input.installerFormat.toUpperCase()} file.` }, { status: 400 });
    }
    const releaseDate = new Date(input.releaseDate);
    if (releaseDate.valueOf() > Date.now() + 24 * 60 * 60 * 1000) {
      return Response.json({ error: "Release date cannot be more than one day in the future." }, { status: 400 });
    }

    const sessionId = randomUUID();
    const key = `releases/${input.platform}/${randomUUID()}.${input.installerFormat}`;
    const admin = createAdminSupabase();
    const { error: insertError } = await admin.from("upload_sessions").insert({
      id: sessionId,
      admin_user_id: adminSession.id,
      platform: input.platform,
      version: input.version,
      build_number: input.buildNumber,
      channel: input.channel,
      release_notes: input.releaseNotes,
      release_date: releaseDate.toISOString(),
      minimum_os: input.minimumOs || null,
      installer_format: input.installerFormat,
      original_filename: releaseFilename(input.platform, input.version, input.buildNumber, input.installerFormat),
      content_type: contentTypeFor(input.installerFormat),
      declared_size: input.fileSize,
      storage_key: key,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (insertError) return Response.json({ error: "Could not start the upload. Try again." }, { status: 503 });

    try {
      const uploadUrl = await createUploadUrl(key, input.installerFormat);
      await writeAudit({ adminUserId: adminSession.id, action: "release.upload_started", subjectType: "upload", subjectId: sessionId, ip: requestIp(request), metadata: { platform: input.platform, format: input.installerFormat, size: input.fileSize } });
      return Response.json({ uploadId: sessionId, uploadUrl, contentType: contentTypeFor(input.installerFormat), filename: releaseFilename(input.platform, input.version, input.buildNumber, input.installerFormat) });
    } catch {
      await admin.from("upload_sessions").delete().eq("id", sessionId);
      return Response.json({ error: "Private file storage is not available." }, { status: 503 });
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing required server environment")) {
      return Response.json({ error: "Upload storage is not configured." }, { status: 503 });
    }
    if (error instanceof Error && error.message === "Authentication required.") return authErrorResponse(error);
    if (error instanceof Error && error.message.startsWith("Change your initial password")) return authErrorResponse(error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not start the upload." }, { status: 400 });
  }
}
