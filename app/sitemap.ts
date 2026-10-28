import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return ["", "/downloads", "/privacy", "/terms"].map((path) => ({ url: `${base}${path}`, changeFrequency: path ? "monthly" : "weekly", priority: path ? 0.6 : 1 }));
}
