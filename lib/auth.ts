import "server-only";
import { redirect } from "next/navigation";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { adminSessionUserId } from "@/lib/admin-session";

export type AdminSession = {
  id: string;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const userId = await adminSessionUserId();
  if (!userId) return null;
  const { data: account, error } = await createAdminSupabase()
    .from("admin_accounts")
    .select("user_id,status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error || !account) return null;
  return { id: account.user_id };
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError(401, "Authentication required.");
  return session;
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
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
