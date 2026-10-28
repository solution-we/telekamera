import type { InstallerFormat } from "./types";

export function validFileSignature(format: InstallerFormat, prefix: Uint8Array) {
  if (format === "apk") return prefix[0] === 0x50 && prefix[1] === 0x4b && [0x03, 0x05, 0x07].includes(prefix[2]);
  if (format === "exe") return prefix[0] === 0x4d && prefix[1] === 0x5a;
  return [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((byte, index) => prefix[index] === byte);
}
