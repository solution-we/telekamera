import { z } from "zod";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { parseJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/security";
import { deleteObject, hashObject, inspectObject, readObjectPrefix } from "@/lib/storage";
import { validFileSignature } from "@/lib/file-security";
import { maxUploadBytes } from "@/lib/config";

const completeSchema = z.object({ uploadId: z.string().uuid() });
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const adminSession = await requireAdmin();
    const { uploadId } = await parseJson(request, completeSchema);
    const admin = createAdminSupabase();
    const { data: upload, error } = await admin.from("upload_sessions").select("*")
      .eq("id", uploadId).eq("admin_user_id", adminSession.id).maybeSingle();
    if (error || !upload || new Date(upload.expires_at).valueOf() <= Date.now()) {
      return Response.json({ error: "Upload session expired. Start the upload again." }, { status: 404 });
    }

    const object = await inspectObject(upload.storage_key);
    if (object.fileSize !== Number(upload.declared_size) || object.fileSize > maxUploadBytes()) {
      await deleteObject(upload.storage_key).catch(() => undefined);
      return Response.json({ error: "Uploaded file size did not match the selected file." }, { status: 400 });
    }
    if (object.contentType !== upload.content_type) {
      await deleteObject(upload.storage_key).catch(() => undefined);
      return Response.json({ error: "Uploaded file type could not be verified." }, { status: 400 });
    }
    const prefix = await readObjectPrefix(upload.storage_key);
    if (!validFileSignature(upload.installer_format, prefix)) {
      await deleteObject(upload.storage_key).catch(() => undefined);
      await admin.from("upload_sessions").delete().eq("id", uploadId);
      return Response.json({ error: "This file does not have the expected installer signature." }, { status: 400 });
    }

    const integrity = await hashObject(upload.storage_key);
    if (integrity.fileSize !== Number(upload.declared_size)) {
      await deleteObject(upload.storage_key).catch(() => undefined);
      return Response.json({ error: "Uploaded file could not be verified. Start again." }, { status: 400 });
    }
    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_release_upload", {
      p_upload_id: uploadId,
      p_admin_user_id: adminSession.id,
      p_file_size: integrity.fileSize,
      p_sha256: integrity.sha256,
      p_content_type: upload.content_type,
      p_original_filename: upload.original_filename,
    });
    if (finalizeError || !finalized?.release_id) {
      return Response.json({ error: "The file was verified but could not be attached to a release. Retry completion." }, { status: 503 });
    }
    if (finalized.previous_storage_key && finalized.previous_storage_key !== upload.storage_key) {
      await deleteObject(finalized.previous_storage_key).catch(() => undefined);
    }
    return Response.json({ ok: true, releaseId: finalized.release_id, filename: upload.original_filename, fileSize: integrity.fileSize, sha256: integrity.sha256 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Missing required server environment")) {
      return Response.json({ error: "Upload storage is not configured." }, { status: 503 });
    }
    if (error instanceof Error && error.message === "Authentication required.") return authErrorResponse(error);
    return Response.json({ error: "Could not verify the uploaded file. Retry or start the upload again." }, { status: 400 });
  }
}
