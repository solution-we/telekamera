import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { hashIp } from "@/lib/security";

export async function writeAudit(input: {
  adminUserId?: string | null;
  action: string;
  subjectType?: string;
  subjectId?: string;
  ip?: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  const admin = createAdminSupabase();
  await admin.from("audit_events").insert({
    admin_user_id: input.adminUserId || null,
    action: input.action,
    subject_type: input.subjectType || null,
    subject_id: input.subjectId || null,
    request_ip_hash: input.ip ? hashIp(input.ip) : null,
    metadata: input.metadata || {},
  });
}
