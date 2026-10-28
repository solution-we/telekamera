import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { backendConfigured } from "@/lib/config";
import type { PublicRelease, ReleaseRecord } from "@/lib/types";
import { selectLatestStable } from "@/lib/release-rules";

const releaseFields = "id,platform,version,build_number,channel,status,release_notes,release_date,minimum_os,published_at,archived_at,created_at,updated_at";
const binaryFields = "id,release_id,installer_format,original_filename,file_size,sha256,content_type";
const privateBinaryFields = `${binaryFields},storage_key`;

function publicRelease(row: ReleaseRecord, binaries: Array<Record<string, unknown>>): PublicRelease {
  return {
    id: row.id,
    platform: row.platform,
    version: row.version,
    build_number: row.build_number,
    channel: row.channel,
    release_notes: row.release_notes,
    release_date: row.release_date,
    minimum_os: row.minimum_os,
    published_at: row.published_at,
    binaries: binaries.map((binary) => ({
      id: String(binary.id),
      installer_format: binary.installer_format as PublicRelease["binaries"][number]["installer_format"],
      original_filename: String(binary.original_filename),
      file_size: Number(binary.file_size),
      sha256: String(binary.sha256),
      content_type: String(binary.content_type),
    })),
  };
}

export async function getPublishedReleases(options: { platform?: string; channel?: string; limit?: number } = {}) {
  if (!backendConfigured()) return [] as PublicRelease[];
  const admin = createAdminSupabase();
  let query = admin.from("releases").select(releaseFields).eq("status", "published").order("published_at", { ascending: false });
  if (options.platform && ["android", "windows"].includes(options.platform)) query = query.eq("platform", options.platform);
  if (options.channel && ["stable", "beta", "prerelease"].includes(options.channel)) query = query.eq("channel", options.channel);
  const { data, error } = await query.limit(options.limit || 100);
  if (error || !data?.length) return [] as PublicRelease[];

  const ids = data.map((row) => row.id);
  const { data: binaries = [] } = await admin.from("release_binaries").select(binaryFields).in("release_id", ids);
  return (data as unknown as ReleaseRecord[]).map((row) => publicRelease(row, (binaries || []).filter((binary) => binary.release_id === row.id) as unknown as Array<Record<string, unknown>>));
}

export async function getPublishedReleasePage(options: { platform?: string; channel?: string; page: number; pageSize: number }) {
  if (!backendConfigured()) return { releases: [] as PublicRelease[], total: 0 };
  const admin = createAdminSupabase();
  const start = (options.page - 1) * options.pageSize;
  let query = admin.from("releases").select(releaseFields, { count: "exact" }).eq("status", "published").order("published_at", { ascending: false });
  if (options.platform && ["android", "windows"].includes(options.platform)) query = query.eq("platform", options.platform);
  if (options.channel && ["stable", "beta", "prerelease"].includes(options.channel)) query = query.eq("channel", options.channel);
  const { data, count, error } = await query.range(start, start + options.pageSize - 1);
  if (error || !data?.length) return { releases: [] as PublicRelease[], total: count || 0 };
  const ids = data.map((row) => row.id);
  const { data: binaries = [] } = await admin.from("release_binaries").select(binaryFields).in("release_id", ids);
  return {
    releases: (data as unknown as ReleaseRecord[]).map((row) => publicRelease(row, (binaries || []).filter((binary) => binary.release_id === row.id) as unknown as Array<Record<string, unknown>>)),
    total: count || 0,
  };
}

export async function getLatestStableRelease(platform: "android" | "windows") {
  if (!backendConfigured()) return null;
  const admin = createAdminSupabase();
  const { data: rows, error } = await admin.from("releases").select(releaseFields)
    .eq("platform", platform).eq("status", "published")
    .order("published_at", { ascending: false }).limit(200);
  const release = selectLatestStable((rows || []) as unknown as Array<ReleaseRecord & { channel: string }>, platform);
  if (error || !release) return null;
  const { data: binaries } = await admin.from("release_binaries").select(binaryFields).eq("release_id", release.id);
  return publicRelease(release as unknown as ReleaseRecord, (binaries || []) as unknown as Array<Record<string, unknown>>);
}

export async function getPublishedReleaseById(platform: "android" | "windows", id: string) {
  if (!backendConfigured()) return null;
  const admin = createAdminSupabase();
  const { data: release, error } = await admin.from("releases").select(releaseFields)
    .eq("id", id).eq("platform", platform).eq("status", "published").maybeSingle();
  if (error || !release) return null;
  const { data: binaries } = await admin.from("release_binaries").select(binaryFields).eq("release_id", id);
  return publicRelease(release as unknown as ReleaseRecord, (binaries || []) as unknown as Array<Record<string, unknown>>);
}

export async function getDownloadRelease(platform: "android" | "windows", id?: string) {
  if (!backendConfigured()) return null;
  const admin = createAdminSupabase();
  let query = admin.from("releases").select(releaseFields).eq("platform", platform).eq("status", "published");
  if (id) query = query.eq("id", id);
  else query = query.eq("channel", "stable").not("published_at", "is", null).order("published_at", { ascending: false });
  const { data: release, error } = await query.limit(1).maybeSingle();
  if (error || !release) return null;
  const { data: binaries, error: binaryError } = await admin.from("release_binaries").select(privateBinaryFields).eq("release_id", release.id);
  if (binaryError) return null;
  return { ...release, binaries: binaries || [] };
}

export async function getAdminReleases() {
  const admin = createAdminSupabase();
  const { data, error } = await admin.from("releases").select(`${releaseFields},release_binaries(${binaryFields})`).order("updated_at", { ascending: false }).limit(250);
  if (error) throw new Error("Could not load releases.");
  return (data || []) as unknown as ReleaseRecord[];
}

export async function getAdminOverview() {
  const admin = createAdminSupabase();
  const counts = await Promise.all(["published", "draft", "archived"].map((status) =>
    admin.from("releases").select("id", { count: "exact", head: true }).eq("status", status),
  ));
  const latest = await Promise.all([
    getLatestStableRelease("android"),
    getLatestStableRelease("windows"),
  ]);
  const { data: recentData } = await admin.from("audit_events").select("id,action,subject_type,subject_id,created_at")
    .order("created_at", { ascending: false }).limit(8);
  const recent = recentData || [];
  return {
    published: counts[0].count || 0,
    drafts: counts[1].count || 0,
    archived: counts[2].count || 0,
    android: latest[0],
    windows: latest[1],
    recent,
  };
}
