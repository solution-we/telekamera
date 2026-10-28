import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { DownloadAction, ReleaseArchive, ReleaseCard } from "@/components/downloads";
import { Icon } from "@/components/icon";
import { getLatestStableRelease, getPublishedReleasePage } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Downloads and release archive",
  description: "Find current TeleKamera releases for Android and Windows, including previous published versions.",
  alternates: { canonical: "/downloads" },
};

export const dynamic = "force-dynamic";

export default async function DownloadsPage({ searchParams }: { searchParams: Promise<{ page?: string; platform?: string; channel?: string }> }) {
  const params = await searchParams;
  const parsedPage = Number.parseInt(params.page || "1", 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, 10000) : 1;
  const platform = ["android", "windows"].includes(params.platform || "") ? params.platform! : "all";
  const channel = ["stable", "beta", "prerelease"].includes(params.channel || "") ? params.channel! : "all";
  const pageSize = 24;
  const [android, windows, releases] = await Promise.all([
    getLatestStableRelease("android"), getLatestStableRelease("windows"), getPublishedReleasePage({ platform, channel, page, pageSize }),
  ]);
  return <PageShell>
    <section className="downloadsHero"><div className="container"><span className="eyebrow"><i/> OFFICIAL RELEASES</span><h1>Downloads.</h1><p>Find the latest stable apps and browse published release history. Installer details and checksums come from the release records.</p>
      <div className="downloadPlatformGrid"><PlatformPanel platform="android" release={android}/><PlatformPanel platform="windows" release={windows}/></div>
    </div></section>
    <section className="container archiveSection" id="archive"><div className="sectionHeading archiveHeading"><div><span className="eyebrow">RELEASE ARCHIVE</span><h2>Previous versions.</h2><p>Published Stable, Beta, and Pre-release builds.</p></div></div><ReleaseArchive releases={releases.releases} platform={platform} channel={channel} page={page} total={releases.total} pageSize={pageSize}/></section>
  </PageShell>;
}

function PlatformPanel({ platform, release }: { platform: "android" | "windows"; release: Awaited<ReturnType<typeof getLatestStableRelease>> }) {
  const label = platform === "android" ? "Android" : "Windows";
  return <article className="platformDownloadPanel"><div className="platformPanelHead"><span className="platformMark"><Icon name={platform === "android" ? "phone" : "monitor"}/></span><div><h2>{label}</h2><p>Latest published Stable release</p></div></div>
    {release ? <ReleaseCard release={release} featured/> : <div className="emptyState"><span className="emptyOrb"><Icon name="download"/></span><h3>{label} release coming soon</h3><p>The download will be enabled when a Stable release is published.</p><DownloadAction platform={platform} release={null}/></div>}
  </article>;
}
