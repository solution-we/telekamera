export type StableCandidate = {
  id: string;
  platform: "android" | "windows";
  channel: string;
  status: string;
  published_at: string | null;
};

export function selectLatestStable<T extends StableCandidate>(releases: T[], platform: "android" | "windows") {
  return releases
    .filter((release) => release.platform === platform && release.channel === "stable" && release.status === "published" && release.published_at)
    .sort((a, b) => new Date(b.published_at!).valueOf() - new Date(a.published_at!).valueOf())[0] || null;
}

export function publicReleaseEligible(status: string) {
  return status === "published";
}
