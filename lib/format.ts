export function formatBytes(bytes: number | string | null | undefined) {
  const amount = Number(bytes || 0);
  if (!Number.isFinite(amount) || amount < 0) return "—";
  if (amount < 1024) return `${amount} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = amount / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[index]}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Date pending";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "Date pending" : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export function prettyChannel(value: string) {
  return value === "prerelease" ? "Pre-release" : `${value[0]?.toUpperCase() || ""}${value.slice(1)}`;
}
