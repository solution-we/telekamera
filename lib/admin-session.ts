import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const cookieName = "telekamera_admin_session";
const sessionSeconds = 12 * 60 * 60;

function sessionSecret() {
  const secret = process.env.AUTH_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Missing required server environment variable: AUTH_RATE_LIMIT_SECRET");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(`telekamera-admin-session:v1:${payload}`).digest("base64url");
}

export function setAdminSessionCookie(response: NextResponse, userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + sessionSeconds })).toString("base64url");
  response.cookies.set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionSeconds,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function readSessionUserId(token: string | undefined) {
  if (!token) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  try {
    const expected = Buffer.from(sign(payload), "base64url");
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    if (typeof parsed.sub !== "string" || typeof parsed.exp !== "number" || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

export async function adminSessionUserId() {
  const cookieStore = await cookies();
  return readSessionUserId(cookieStore.get(cookieName)?.value);
}
