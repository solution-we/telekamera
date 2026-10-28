import Link from "next/link";
import { Icon } from "@/components/icon";
import { formatBytes, formatDate, prettyChannel } from "@/lib/format";
import type { PublicRelease } from "@/lib/types";

export function DownloadAction({ platform, release, label }: { platform: "android" | "windows"; release: PublicRelease | null; label?: string }) {
  if (!release) return <span className="button buttonDisabled" aria-disabled="true">Coming soon</span>;
  return <Link className="button buttonPrimary" href={platform === "android" ? "/download/android" : "/download/windows"}>
    <Icon name="download" size={16}/>{label || `Download for ${platform === "android" ? "Android" : "Windows"}`}
  </Link>;
}

export function ReleaseCard({ release, featured = false }: { release: PublicRelease; featured?: boolean }) {
  const platformLabel = release.platform === "android" ? "Android" : "Windows";
  return <article className={`releaseCard ${featured ? "releaseFeatured" : ""}`}>
    <div className="releaseCardHead"><span className="platformMark"><Icon name={release.platform === "android" ? "phone" : "monitor"}/></span><span className="releasePlatform">{platformLabel}</span><span className={`channelPill channel-${release.channel}`}>{prettyChannel(release.channel)}</span></div>
    <div className="releaseVersion">{release.version}</div>
    <div className="releaseMeta">Released {formatDate(release.release_date)}<span>·</span>{release.binaries.map((binary) => formatBytes(binary.file_size)).join(" · ")}</div>
    {release.release_notes ? <p className="releaseNotes">{release.release_notes}</p> : <p className="releaseNotes muted">Release notes were not provided.</p>}
    <div className="binaryLinks">{release.binaries.map((binary) => <a key={binary.id} href={release.platform === "android" ? `/download/android/${release.id}` : `/download/windows/${release.id}?format=${binary.installer_format}`}>
      <span><Icon name="download" size={15}/> {binary.installer_format.toUpperCase()}</span><small>{formatBytes(binary.file_size)}</small>
    </a>)}</div>
    {release.binaries.map((binary) => <details className="checksum" key={`checksum-${binary.id}`}><summary>SHA-256 · {binary.installer_format.toUpperCase()}</summary><code>{binary.sha256}</code></details>)}
  </article>;
}

export function ReleaseArchive({ releases, platform, channel, page, total, pageSize }: {
  releases: PublicRelease[]; platform: string; channel: string; page: number; total: number; pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    if (platform !== "all") params.set("platform", platform);
    if (channel !== "all") params.set("channel", channel);
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return `/downloads${query ? `?${query}` : ""}#archive`;
  };
  return <>
    <form className="archiveFilters" method="get" action="/downloads"><input type="hidden" name="page" value="1"/><label>Platform<select name="platform" defaultValue={platform}><option value="all">All platforms</option><option value="android">Android</option><option value="windows">Windows</option></select></label>
      <label>Channel<select name="channel" defaultValue={channel}><option value="all">All channels</option><option value="stable">Stable</option><option value="beta">Beta</option><option value="prerelease">Pre-release</option></select></label>
      <button className="button buttonOutline buttonSmall" type="submit">Apply filters</button><span className="muted">{total} release{total === 1 ? "" : "s"}</span></form>
    {releases.length ? <div className="releaseGrid">{releases.map((release) => <ReleaseCard key={release.id} release={release}/>)}</div> : <div className="emptyState"><span className="emptyOrb"><Icon name="download" size={24}/></span><h3>No releases here yet</h3><p>Published releases will appear in this archive as they become available.</p></div>}
    {pages > 1 ? <nav className="archivePagination" aria-label="Release archive pages"><span>Page {page} of {pages}</span><div>{page > 1 ? <Link href={pageUrl(page - 1)}>Previous</Link> : <span className="disabledPage">Previous</span>}{page < pages ? <Link href={pageUrl(page + 1)}>Next</Link> : <span className="disabledPage">Next</span>}</div></nav> : null}
  </>;
}
