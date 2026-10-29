import { describe, expect, it } from "vitest";
import { pinChangeSchema, pinLoginSchema, uploadInitiateSchema } from "../lib/validation";

const baseUpload = {
  version: "1.2.0",
  buildNumber: "120",
  channel: "stable",
  releaseNotes: "Bug fixes",
  releaseDate: "2026-10-28T00:00:00.000Z",
  minimumOs: null,
  filename: "installer.apk",
  contentType: "application/octet-stream",
  fileSize: 1024,
};

describe("administrator input validation", () => {
  it("accepts one-to-twelve digit codes and rejects other input", () => {
    expect(pinLoginSchema.safeParse({ pin: "2008" }).success).toBe(true);
    expect(pinLoginSchema.safeParse({ pin: "123456789012" }).success).toBe(true);
    expect(pinLoginSchema.safeParse({ pin: "1234567890123" }).success).toBe(false);
    expect(pinLoginSchema.safeParse({ pin: "12ab" }).success).toBe(false);
  });

  it("requires matching codes when changing the admin code", () => {
    expect(pinChangeSchema.safeParse({ pin: "2008", confirmation: "2008" }).success).toBe(true);
    expect(pinChangeSchema.safeParse({ pin: "2008", confirmation: "2009" }).success).toBe(false);
  });

  it("accepts an APK and rejects platform-incompatible installer formats", () => {
    expect(uploadInitiateSchema.safeParse({ ...baseUpload, platform: "android", installerFormat: "apk" }).success).toBe(true);
    expect(uploadInitiateSchema.safeParse({ ...baseUpload, platform: "android", installerFormat: "exe" }).success).toBe(false);
    expect(uploadInitiateSchema.safeParse({ ...baseUpload, platform: "windows", installerFormat: "apk" }).success).toBe(false);
  });

  it("accepts Windows EXE and MSI installers", () => {
    expect(uploadInitiateSchema.safeParse({ ...baseUpload, platform: "windows", installerFormat: "exe", filename: "setup.exe" }).success).toBe(true);
    expect(uploadInitiateSchema.safeParse({ ...baseUpload, platform: "windows", installerFormat: "msi", filename: "setup.msi" }).success).toBe(true);
  });
});
