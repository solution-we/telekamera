import { describe, expect, it } from "vitest";
import { publicReleaseEligible, selectLatestStable } from "../lib/release-rules";

const candidate = (id: string, platform: "android" | "windows", channel: string, status: string, published_at: string | null) => ({ id, platform, channel, status, published_at });

describe("stable release selection", () => {
  it("selects the newest published stable release independently per platform", () => {
    const releases = [
      candidate("android-old", "android", "stable", "published", "2026-01-01T00:00:00Z"),
      candidate("android-new", "android", "stable", "published", "2026-02-01T00:00:00Z"),
      candidate("android-beta", "android", "beta", "published", "2026-03-01T00:00:00Z"),
      candidate("windows", "windows", "stable", "published", "2026-01-15T00:00:00Z"),
    ];
    expect(selectLatestStable(releases, "android")?.id).toBe("android-new");
    expect(selectLatestStable(releases, "windows")?.id).toBe("windows");
  });

  it("ignores drafts, unpublished and archived stable releases", () => {
    const releases = [
      candidate("draft", "android", "stable", "draft", "2026-04-01T00:00:00Z"),
      candidate("unpublished", "android", "stable", "unpublished", "2026-03-01T00:00:00Z"),
      candidate("archived", "android", "stable", "archived", "2026-02-01T00:00:00Z"),
    ];
    expect(selectLatestStable(releases, "android")).toBeNull();
    expect(publicReleaseEligible("draft")).toBe(false);
    expect(publicReleaseEligible("published")).toBe(true);
  });
});
