import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

export const passwordChangeSchema = z.object({
  password: z.string().min(14).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});

const releaseBase = {
  platform: z.enum(["android", "windows"]),
  version: z.string().trim().min(1).max(40).regex(/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/),
  buildNumber: z.string().trim().min(1).max(60).regex(/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/),
  channel: z.enum(["stable", "beta", "prerelease"]),
  releaseNotes: z.string().max(20_000).default(""),
  releaseDate: z.string().datetime({ offset: true }),
  minimumOs: z.string().trim().max(120).optional().nullable(),
};

export const uploadInitiateSchema = z.object({
  ...releaseBase,
  installerFormat: z.enum(["apk", "exe", "msi"]),
  filename: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1).max(160),
  fileSize: z.number().int().positive(),
}).refine((value) => value.platform === "android" ? value.installerFormat === "apk" : ["exe", "msi"].includes(value.installerFormat), {
  message: "Choose a file format supported by the selected platform.",
});

export const releasePatchSchema = z.object({
  version: z.string().trim().min(1).max(40).regex(/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/).optional(),
  buildNumber: z.string().trim().min(1).max(60).regex(/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/).optional(),
  channel: z.enum(["stable", "beta", "prerelease"]).optional(),
  releaseNotes: z.string().max(20_000).optional(),
  releaseDate: z.string().datetime({ offset: true }).optional(),
  minimumOs: z.string().trim().max(120).optional().nullable(),
  status: z.enum(["draft", "published", "unpublished", "archived"]).optional(),
});

export function releaseFilename(platform: "android" | "windows", version: string, build: string, format: string) {
  const normalized = version.replace(/[^A-Za-z0-9._+-]/g, "_");
  const safeBuild = build.replace(/[^A-Za-z0-9._+-]/g, "_");
  return `TeleKamera-${platform}-${normalized}-${safeBuild}.${format}`;
}
