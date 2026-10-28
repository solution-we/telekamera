import { describe, expect, it } from "vitest";
import { safeContentDisposition, safeFilename } from "../lib/file-utils";

describe("download filenames", () => {
  it("removes path separators and control characters", () => {
    expect(safeFilename("../../setup\r\n.apk")).toBe(".._.._setup__.apk");
  });

  it("emits an attachment disposition with a safe filename", () => {
    expect(safeContentDisposition("TeleKamera setup.apk")).toContain('attachment; filename="TeleKamera_setup.apk"');
    expect(safeContentDisposition("TeleKamera setup.apk")).toContain("filename*=UTF-8''");
  });
});
