import Link from "next/link";
import { AdminFrame } from "@/components/admin-shell";
import { getAdminOverview, getLatestStableRelease } from "@/lib/releases";
import { requireAdminPage } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/icon";

export const metadata = { title: "Administrator overview", robots: { index: false, follow: false } };

export default async function AdminOverviewPage() {
  await requireAdminPage();
  const overview = await getAdminOverview();
  return <AdminFrame active="overview">
    <div className="adminTitleRow"><div><span className="eyebrow">TELEKAMERA ADMIN</span><h1>Release overview</h1><p>Publish and maintain the software shown on the public site.</p></div><Link className="button buttonPrimary" href="/admin/releases#upload"><Icon name="download" size={16}/> Upload release</Link></div>
    <section className="statsGrid" aria-label="Release totals"><article className="statCard"><span>Published releases</span><b>{overview.published}</b></article><article className="statCard"><span>Draft releases</span><b>{overview.drafts}</b></article><article className="statCard"><span>Archived releases</span><b>{overview.archived}</b></article></section>
    <section className="latestAdminGrid" aria-label="Latest stable releases"><PlatformCard platform="Android" release={overview.android}/><PlatformCard platform="Windows" release={overview.windows}/></section>
    <section className="adminPanel"><div className="adminPanelHead"><h2>Recent activity</h2><span className="eyebrow">ADMIN AUDIT</span></div>
      {overview.recent.length ? <div className="auditList">{overview.recent.map((event: { id: string; action: string; subject_type: string | null; subject_id: string | null; created_at: string }) => <div className="auditItem" key={event.id}><span>{event.action.replaceAll(".", " · ")}{event.subject_type ? ` — ${event.subject_type}` : ""}</span><time>{formatDate(event.created_at)}</time></div>)}</div> : <div className="emptyState compact"><h3>No activity yet</h3><p>Administrator actions will appear here.</p></div>}
    </section>
    <section className="adminPanel"><div className="adminPanelHead"><h2>Release workflow</h2><Icon name="shield"/></div><p className="muted" style={{ fontSize: ".82rem", margin: 0 }}>Uploads are verified and saved as drafts. Publish a release in the release manager when its notes and compatibility details are ready. Only published releases appear on the public website.</p></section>
  </AdminFrame>;
}

function PlatformCard({ platform, release }: { platform: string; release: Awaited<ReturnType<typeof getLatestStableRelease>> }) {
  return <article className="adminPlatformCard"><div><span className="platformMark"><Icon name={platform === "Android" ? "phone" : "monitor"}/></span><div><span className="eyebrow">LATEST STABLE</span><h3>{platform}</h3></div></div>{release ? <p><strong>v{release.version}</strong> · Published {formatDate(release.published_at)}<br/>{release.binaries.map((binary) => binary.installer_format.toUpperCase()).join(" + ")}</p> : <p>No stable release published yet.</p>}</article>;
}
