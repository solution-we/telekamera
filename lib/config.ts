export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://telekamera.example").replace(/\/$/, "");
}

export function supportEmail() {
  const value = process.env.SUPPORT_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
}

export function backendConfigured() {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_PUBLISHABLE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function maxUploadBytes() {
  const configured = Number(process.env.MAX_UPLOAD_BYTES);
  return Number.isSafeInteger(configured) && configured > 0 ? configured : 2 * 1024 * 1024 * 1024;
}

export function requireEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required server environment variable: ${name}`);
  return value;
}
