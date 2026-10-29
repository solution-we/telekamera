import { z } from "zod";

export const pinLoginSchema = z.object({
  pin: z.string().regex(/^[0-9]{1,12}$/),
});

export const pinChangeSchema = z.object({
  pin: z.string().regex(/^[0-9]{1,12}$/),
  confirmation: z.string().regex(/^[0-9]{1,12}$/),
}).refine((value) => value.pin === value.confirmation, {
  message: "The access codes do not match.",
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
