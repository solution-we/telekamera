import { createAdminSupabase } from "@/lib/supabase/admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { parseJson } from "@/lib/api";
import { releasePatchSchema } from "@/lib/validation";
import { assertSameOrigin, requestIp } from "@/lib/security";
import { writeAudit } from "@/lib/audit";
import { deleteObject } from "@/lib/storage";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ releaseId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const session = await requireAdmin();
    const { releaseId } = await context.params;
    const patch = await parseJson(request, releasePatchSchema);
    if (patch.releaseDate && new Date(patch.releaseDate).valueOf() > Date.now() + 24 * 60 * 60 * 1000) {
      return Response.json({ error: "Release date cannot be more than one day in the future." }, { status: 400 });
    }
    const admin = createAdminSupabase();
    const { data: current, error: loadError } = await admin.from("releases").select("id,status,published_at")
      .eq("id", releaseId).maybeSingle();
    if (loadError || !current) return Response.json({ error: "Release not found." }, { status: 404 });

    const update: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if (patch.version !== undefined) update.version = patch.version;
    if (patch.buildNumber !== undefined) update.build_number = patch.buildNumber;
    if (patch.channel !== undefined) update.channel = patch.channel;
    if (patch.releaseNotes !== undefined) update.release_notes = patch.releaseNotes;
    if (patch.releaseDate !== undefined) update.release_date = new Date(patch.releaseDate).toISOString();
    if (patch.minimumOs !== undefined) update.minimum_os = patch.minimumOs || null;

    if (patch.status !== undefined) {
      if (patch.status === "published" && current.status !== "published") {
        const { count, error } = await admin.from("release_binaries").select("id", { count: "exact", head: true }).eq("release_id", releaseId);
        if (error || !count) return Response.json({ error: "Add and verify at least one installer before publishing." }, { status: 409 });
      }
      update.status = patch.status;
      update.published_at = patch.status === "published"
        ? current.status === "published" ? current.published_at : new Date().toISOString()
        : null;
      update.archived_at = patch.status === "archived" ? new Date().toISOString() : null;
    }

    const { data: saved, error } = await admin.from("releases").update(update).eq("id", releaseId).select("id").maybeSingle();
    if (error || !saved) return Response.json({ error: "The release could not be saved. Check for a duplicate version and try again." }, { status: 409 });
    const action = patch.status ? `release.${patch.status}` : "release.updated";
    await writeAudit({ adminUserId: session.id, action, subjectType: "release", subjectId: releaseId, ip: requestIp(request), metadata: { updated_fields: Object.keys(patch).join(",") } });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Request could not be verified." }, { status: 403 });
  try {
    const session = await requireAdmin();
    const { releaseId } = await context.params;
    const admin = createAdminSupabase();
    const { data: release, error: releaseError } = await admin.from("releases").select("id,status")
      .eq("id", releaseId).maybeSingle();
    if (releaseError || !release) return Response.json({ error: "Release not found." }, { status: 404 });
    if (release.status === "published") return Response.json({ error: "Unpublish or archive this release before deleting it." }, { status: 409 });
    const { data: binaries, error: binaryError } = await admin.from("release_binaries").select("storage_key")
      .eq("release_id", releaseId);
    if (binaryError) return Response.json({ error: "Could not verify release files." }, { status: 503 });
    await writeAudit({ adminUserId: session.id, action: "release.deleted", subjectType: "release", subjectId: releaseId, ip: requestIp(request) });
    const { error } = await admin.from("releases").delete().eq("id", releaseId);
    if (error) return Response.json({ error: "The release could not be deleted." }, { status: 503 });
    await Promise.all((binaries || []).map((binary) => deleteObject(binary.storage_key).catch(() => undefined)));
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
