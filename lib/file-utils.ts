export function safeFilename(input: string) {
  const cleaned = input.normalize("NFKC").replace(/[\\/\r\n\0]/g, "_").replace(/[^A-Za-z0-9._-]/g, "_");
  return cleaned.slice(-120) || "telekamera-download";
}

export function safeContentDisposition(filename: string) {
  const safe = safeFilename(filename);
  const encoded = encodeURIComponent(filename.replace(/[\r\n\0]/g, "")).replace(/['()]/g, escape);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}
