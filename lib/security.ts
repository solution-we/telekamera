import "server-only";
import { createHmac } from "node:crypto";
import { siteUrl } from "@/lib/config";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(siteUrl()).origin;
  } catch {
    return false;
  }
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function hashIp(ip: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing required server environment variable: AUTH_RATE_LIMIT_SECRET");
  return createHmac("sha256", secret).update(ip).digest("hex");
}

export function loginBucketKey(scope: "email" | "ip", value: string) {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing required server environment variable: AUTH_RATE_LIMIT_SECRET");
  return createHmac("sha256", secret).update(`${scope}|${value.toLowerCase()}`).digest("hex");
}

export function isValidSha256(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}
