"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { formatBytes, formatDate, prettyChannel } from "@/lib/format";
import type { ReleaseRecord } from "@/lib/types";

type Message = { kind: "error" | "success"; text: string } | null;

async function postJson(url: string, body?: unknown, method = "POST") {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

export function AdminLoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await postJson("/api/admin/login", { email: form.get("email"), password: form.get("password") });
      router.push(result.mustChangePassword ? "/admin/change-password" : "/admin");
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Unable to sign in." });
    } finally { setBusy(false); }
  }
  return <form className="adminForm" onSubmit={submit}>
    <label>Email address<input type="email" name="email" autoComplete="username" required maxLength={254}/></label>
    <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={256}/></label>
    {message ? <p className={`formMessage ${message.kind}`} role="status">{message.text}</p> : null}
    <button className="button buttonPrimary buttonFull" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<Icon name="arrow" size={16}/></button>
  </form>;
}

export function PasswordChangeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (password !== confirmation) { setMessage({ kind: "error", text: "The passwords do not match." }); setBusy(false); return; }
    try {
      await postJson("/api/admin/password", { password });
      setMessage({ kind: "success", text: "Password updated. Please sign in again with your new password." });
      router.push("/admin/login"); router.refresh();
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not change the password." }); }
    finally { setBusy(false); }
  }
  return <form className="adminForm" onSubmit={submit}>
    <label>New password<input type="password" name="password" autoComplete="new-password" required minLength={14} maxLength={128}/></label>
    <small className="formHint">Use at least 14 characters with a lowercase letter, uppercase letter, and number.</small>
    <label>Confirm new password<input type="password" name="confirmation" autoComplete="new-password" required minLength={14} maxLength={128}/></label>
    {message ? <p className={`formMessage ${message.kind}`} role="status">{message.text}</p> : null}
    <button className="button buttonPrimary buttonFull" disabled={busy}>{busy ? "Saving…" : "Set new password"}<Icon name="arrow" size={16}/></button>
  </form>;
}

export function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try { await postJson("/api/admin/logout"); } finally { router.push("/admin/login"); router.refresh(); }
  }
  return <button className="button buttonOutline buttonSmall" onClick={logout} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>;
}

type UploadForm = { platform: "android" | "windows"; version: string; buildNumber: string; channel: string; releaseDate: string; minimumOs: string; releaseNotes: string; file: File };

function UploadReleaseForm({ onComplete }: { onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<Message>(null);
  const [platform, setPlatform] = useState<"android" | "windows">("android");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setProgress(0); setMessage(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) { setMessage({ kind: "error", text: "Choose an installer file first." }); setBusy(false); return; }
    const extension = file.name.split(".").pop()?.toLowerCase();
    const format = platform === "android" ? "apk" : extension;
    if (!(format === "apk" || format === "exe" || format === "msi") || (platform === "android" && extension !== "apk")) {
      setMessage({ kind: "error", text: platform === "android" ? "Choose an APK file." : "Choose an EXE or MSI installer." }); setBusy(false); return;
    }
    const input: UploadForm = {
      platform, version: String(form.get("version")), buildNumber: String(form.get("buildNumber")), channel: String(form.get("channel")),
      releaseDate: new Date(String(form.get("releaseDate"))).toISOString(), minimumOs: String(form.get("minimumOs") || ""),
      releaseNotes: String(form.get("releaseNotes") || ""), file,
    };
    try {
      const start = await postJson("/api/admin/uploads/initiate", {
        platform: input.platform, version: input.version, buildNumber: input.buildNumber, channel: input.channel,
        releaseDate: input.releaseDate, minimumOs: input.minimumOs || null, releaseNotes: input.releaseNotes,
        installerFormat: format, filename: file.name, contentType: file.type || "application/octet-stream", fileSize: file.size,
      });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", start.uploadUrl);
        xhr.setRequestHeader("Content-Type", start.contentType);
        xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 85)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("The file upload did not complete. Check storage permissions and retry."));
        xhr.onerror = () => reject(new Error("The file could not reach private storage. Check storage CORS settings and retry."));
        xhr.onabort = () => reject(new Error("The file upload was cancelled."));
        xhr.send(file);
      });
      setProgress(90);
      await postJson("/api/admin/uploads/complete", { uploadId: start.uploadId });
      setProgress(100); setMessage({ kind: "success", text: "File verified and attached to the draft release." });
      formElement.reset();
      onComplete();
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Upload could not be completed." }); }
    finally { setBusy(false); }
  }

  return <form className="uploadForm" id="upload" onSubmit={submit}>
    <div className="uploadFormIntro"><span className="eyebrow">NEW RELEASE FILE</span><h2>Upload a release</h2><p>Files upload directly to private storage. The server verifies file size, format signature, and checksum before saving.</p></div>
    <div className="formGrid">
      <label>Platform<select value={platform} onChange={(event) => setPlatform(event.target.value as "android" | "windows")}><option value="android">Android</option><option value="windows">Windows</option></select></label>
      <label>Installer file<input name="file" type="file" required accept={platform === "android" ? ".apk,application/vnd.android.package-archive" : ".exe,.msi"}/></label>
      <label>Version<input name="version" required maxLength={40} placeholder="e.g. 1.0.0"/></label>
      <label>Build number<input name="buildNumber" required maxLength={60} placeholder="e.g. 100"/></label>
      <label>Channel<select name="channel"><option value="stable">Stable</option><option value="beta">Beta</option><option value="prerelease">Pre-release</option></select></label>
      <label>Release date<input name="releaseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required/></label>
      <label className="fullField">Minimum OS <span className="optionalLabel">Optional</span><input name="minimumOs" maxLength={120} placeholder="Add a requirement only when verified"/></label>
      <label className="fullField">Release notes<textarea name="releaseNotes" rows={4} maxLength={20000} placeholder="What changed in this release?"/></label>
    </div>
    {busy ? <div className="uploadProgress" aria-live="polite"><div><span>Uploading and verifying</span><b>{progress}%</b></div><progress max="100" value={progress}/></div> : null}
    {message ? <p className={`formMessage ${message.kind}`} role="status">{message.text}</p> : null}
    <button className="button buttonPrimary" disabled={busy}><Icon name="download" size={16}/>{busy ? "Working…" : "Upload and verify"}</button>
  </form>;
}

function ReleaseRow({ release, onChanged }: { release: ReleaseRecord; onChanged: () => void }) {
  const router = useRouter();
  const [notes, setNotes] = useState(release.release_notes || "");
  const [status, setStatus] = useState(release.status);
  const [version, setVersion] = useState(release.version);
  const [build, setBuild] = useState(release.build_number);
  const [channel, setChannel] = useState(release.channel);
  const [releaseDate, setReleaseDate] = useState(new Date(release.release_date).toISOString().slice(0, 10));
  const [minimumOs, setMinimumOs] = useState(release.minimum_os || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const binaries = release.release_binaries || [];
  async function save() {
    setBusy(true); setMessage("");
    try { await postJson(`/api/admin/releases/${release.id}`, { version, buildNumber: build, channel, releaseDate: new Date(`${releaseDate}T00:00:00Z`).toISOString(), minimumOs: minimumOs || null, releaseNotes: notes, status }, "PATCH"); setMessage("Saved"); onChanged(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(`Delete ${release.platform} ${release.version} and its installer files? This cannot be undone.`)) return;
    setBusy(true); setMessage("");
    try { await postJson(`/api/admin/releases/${release.id}`, undefined, "DELETE"); onChanged(); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete."); }
    finally { setBusy(false); }
  }
  const format = binaries.map((binary) => binary.installer_format.toUpperCase()).join(" + ") || "No file";
  return <article className="adminReleaseRow">
    <div className="releaseRowTop"><div><span className="releasePlatform">{release.platform}</span><h3>{release.version} <small>build {release.build_number}</small></h3><p>{prettyChannel(release.channel)} · {formatDate(release.release_date)} · {format}</p></div><span className={`statusBadge status-${release.status}`}>{release.status}</span></div>
    <div className="releaseRowFiles">{binaries.map((binary) => <div className="checksumRow" key={binary.id}><span>{binary.installer_format.toUpperCase()} · {formatBytes(binary.file_size)}</span><code>{binary.sha256}</code></div>)}</div>
    <div className="releaseRowEdit"><label>Version<input value={version} maxLength={40} onChange={(event) => setVersion(event.target.value)}/></label><label>Build number<input value={build} maxLength={60} onChange={(event) => setBuild(event.target.value)}/></label><label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value as ReleaseRecord["channel"])}><option value="stable">Stable</option><option value="beta">Beta</option><option value="prerelease">Pre-release</option></select></label><label>Release date<input type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)}/></label><label>Minimum OS<input value={minimumOs} maxLength={120} onChange={(event) => setMinimumOs(event.target.value)}/></label><label>Publication status<select value={status} onChange={(event) => setStatus(event.target.value as ReleaseRecord["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option></select></label><label className="fullField">Release notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)}/></label></div>
    <div className="releaseRowActions"><button className="button buttonPrimary buttonSmall" onClick={save} disabled={busy}>Save changes</button>{release.status !== "published" ? <button className="button buttonDanger buttonSmall" onClick={remove} disabled={busy}>Delete</button> : null}{release.status === "published" ? <a className="button buttonOutline buttonSmall" href={release.platform === "android" ? `/download/android/${release.id}` : `/download/windows/${release.id}`} target="_blank" rel="noreferrer">Open public link</a> : null}{message ? <span className="muted" role="status">{message}</span> : null}</div>
  </article>;
}

export function ReleaseManager({ initialReleases }: { initialReleases: ReleaseRecord[] }) {
  const [releases, setReleases] = useState(initialReleases);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const visible = useMemo(() => releases.filter((release) => (filter === "all" || release.status === filter || release.platform === filter) && `${release.platform} ${release.version} ${release.build_number}`.toLowerCase().includes(search.toLowerCase())), [releases, filter, search]);
  useEffect(() => {
    let active = true;
    fetch("/api/admin/releases", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh release data.");
      if (active) setReleases(data.releases || []);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not refresh release data."); });
    return () => { active = false; };
  }, [refreshKey]);
  const refresh = () => { setRefreshKey((value) => value + 1); };
  return <div className="adminReleaseManager">
    <UploadReleaseForm onComplete={refresh}/>
    <section className="releaseManagerList"><div className="managerHeading"><div><span className="eyebrow">RELEASE ARCHIVE</span><h2>Manage releases</h2></div><button className="button buttonOutline buttonSmall" onClick={refresh}>Refresh</button></div>
      <div className="managerFilters"><label>Search<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Version, build, platform"/></label><label>Filter<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All releases</option><option value="android">Android</option><option value="windows">Windows</option><option value="published">Published</option><option value="draft">Draft</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option></select></label><span className="muted">{visible.length} shown</span></div>
      {error ? <p className="formMessage error">{error}</p> : null}
      {visible.length ? <div className="adminReleaseList">{visible.map((release) => <ReleaseRow key={release.id} release={release} onChanged={refresh}/>)}</div> : <div className="emptyState compact"><h3>No releases found</h3><p>Use the upload form to add an installer. Each upload starts as a draft.</p></div>}
    </section>
  </div>;
}
