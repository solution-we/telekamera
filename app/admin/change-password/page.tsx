import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/site";
import { PasswordChangeForm } from "@/components/admin";
import { getAdminSession } from "@/lib/auth";

export const metadata = { title: "Set administrator password", robots: { index: false, follow: false } };

export default async function ChangePasswordPage() {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login");
  if (!session.mustChangePassword) redirect("/admin");
  return <main className="adminPage"><div className="adminLoginWrap"><div className="adminLoginCard">
    <Wordmark/><span className="eyebrow">ACCOUNT SECURITY</span><h1>Set a new password.</h1><p>Change the one-time administrator password before opening the dashboard.</p>
    <div className="adminNotice">Use at least 14 characters, including uppercase, lowercase, and a number.</div><div style={{ height: 16 }}/><PasswordChangeForm/>
    <Link className="textLink loginBack" href="/admin/login">Sign out and return</Link>
  </div></div></main>;
}
