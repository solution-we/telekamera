import { AdminFrame } from "@/components/admin-shell";
import { PasswordChangeForm } from "@/components/admin";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Account settings", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  await requireAdminPage();
  return <AdminFrame active="settings"><div className="adminTitleRow"><div><span className="eyebrow">ACCOUNT SECURITY</span><h1>Account settings</h1><p>Change the administrator password. Other active sessions are invalidated after a password change.</p></div></div>
    <section className="adminPanel settingsFormPanel"><h2>Change password</h2><p className="muted">Use at least 14 characters with uppercase, lowercase, and numeric characters. Sign in again after saving.</p><PasswordChangeForm/></section>
  </AdminFrame>;
}
