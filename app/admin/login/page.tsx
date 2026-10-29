import { redirect } from "next/navigation";
import { Wordmark } from "@/components/site";
import { AdminLoginForm } from "@/components/admin";
import { getAdminSession } from "@/lib/auth";

export const metadata = { title: "Administrator sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const session = await getAdminSession().catch(() => null);
  if (session) redirect("/admin");
  return <main className="adminPage"><div className="adminLoginWrap">
    <div className="adminLoginCard"><Wordmark/><span className="eyebrow">PRIVATE ADMIN AREA</span><h1>Admin access.</h1><p>Enter your access code to manage TeleKamera releases and downloads.</p><AdminLoginForm/></div>
    <p className="loginFootnote">Administrator access is restricted to the configured access code.</p>
  </div></main>;
}
