import { describe, expect, it } from "vitest";
import { passwordChangeSchema, uploadInitiateSchema } from "../lib/validation";

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
  it("requires a strong new password", () => {
    expect(passwordChangeSchema.safeParse({ password: "adminoftelecamera" }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "Sufficiently-Long9" }).success).toBe(true);
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
