import { redirect } from "next/navigation";

export const metadata = { title: "Admin access code", robots: { index: false, follow: false } };

export default function ChangePasswordPage() {
  redirect("/admin/settings");
}
