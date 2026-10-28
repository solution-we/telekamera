import "server-only";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export type AdminSession = {
  id: string;
  email: string;
  mustChangePassword: boolean;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createServerSupabase();
  const { data: claimsResult, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsResult?.claims;
  if (claimsError || !claims || typeof claims.sub !== "string" || (claims.app_metadata as Record<string, unknown> | undefined)?.role !== "admin") return null;
  const userId = claims.sub;
  const authTimeMs = Number(claims.auth_time || 0) * 1000;
  if (!Number.isFinite(authTimeMs) || authTimeMs <= 0 || Date.now() - authTimeMs > 12 * 60 * 60 * 1000) return null;

  const admin = createAdminSupabase();
  const { data: account } = await admin
    .from("admin_accounts")
    .select("user_id,email_normalized,status,must_change_password,password_changed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!account || account.status !== "active") return null;
  const changedAt = account.password_changed_at ? new Date(account.password_changed_at).valueOf() : null;
  if (changedAt && authTimeMs < changedAt) return null;

  return { id: userId, email: account.email_normalized, mustChangePassword: account.must_change_password };
}

export async function requireAdmin(options: { allowPasswordChange?: boolean } = {}) {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError(401, "Authentication required.");
  if (session.mustChangePassword && !options.allowPasswordChange) {
    throw new AdminAuthError(403, "Change your initial password before continuing.");
  }
  return session;
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  if (session.mustChangePassword) redirect("/admin/change-password");
  return session;
}

export class AdminAuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json({ error: "A server error occurred." }, { status: 500 });
}
