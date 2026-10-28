import { describe, expect, it } from "vitest";
import { validFileSignature } from "../lib/file-security";

describe("installer signature checks", () => {
  it("accepts ZIP based APK, PE EXE, and MSI compound document headers", () => {
    expect(validFileSignature("apk", Uint8Array.from([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(validFileSignature("exe", Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]))).toBe(true);
    expect(validFileSignature("msi", Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe(true);
  });

  it("rejects file names that do not match their declared installer format", () => {
    expect(validFileSignature("apk", Uint8Array.from([0x4d, 0x5a, 0x00, 0x00]))).toBe(false);
    expect(validFileSignature("exe", new Uint8Array())).toBe(false);
    expect(validFileSignature("msi", Uint8Array.from([0x50, 0x4b, 0x03, 0x04]))).toBe(false);
  });
});
