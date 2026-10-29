import { AdminFrame } from "@/components/admin-shell";
import { AdminPinForm } from "@/components/admin";
import { requireAdminPage } from "@/lib/auth";

export const metadata = { title: "Admin access code", robots: { index: false, follow: false } };

export default async function AdminSettingsPage() {
  await requireAdminPage();
  return <AdminFrame active="settings"><div className="adminTitleRow"><div><span className="eyebrow">ADMIN ACCESS</span><h1>Access code</h1><p>Change the numeric code used to unlock the administrator area.</p></div></div>
    <section className="adminPanel settingsFormPanel"><h2>Set a new code</h2><p className="muted">The code is saved as a one-way hash and is never displayed again.</p><AdminPinForm/></section>
  </AdminFrame>;
}
