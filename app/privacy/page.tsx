import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { supportEmail } from "@/lib/config";

export const metadata: Metadata = { title: "Privacy policy", description: "How the TeleKamera website handles administrator and download information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const contact = supportEmail();
  return <PageShell><div className="container legalPage"><article><span className="eyebrow">TELEKAMERA</span><h1>Privacy policy</h1><p className="updated">Owner review required before launch</p>
    <p>This page describes the information handled by the TeleKamera website as currently implemented. The site does not include advertising trackers or public visitor analytics.</p>
    <h2>Administrator sign-in</h2><p>The administrator sign-in uses Supabase Auth. The administrator email address and password are used to authenticate the administrator; the application does not store a plaintext password. Login attempts are rate-limited. The application stores a keyed hash of the network address used for that rate limit and may record a keyed network-address hash in administrator audit events. These records are stored in the configured database.</p>
    <h2>Release downloads</h2><p>Public release pages show release metadata, installer sizes, and SHA-256 checksums. Starting a download creates a short-lived, signed link to the private file-storage object. The configured storage provider processes the request and may keep technical request logs under its own policies.</p>
    <h2>Retention and security</h2><p>Administrator audit records remain in the database until an operator removes them. The storage, database, and hosting providers may have their own backup and operational log retention. Configure and document retention periods with those providers before launch. Authentication uses secure cookies over HTTPS in production; installer binaries are held in a private bucket.</p>
    <h2>Contact</h2>{contact ? <p>For privacy questions, contact <a href={`mailto:${contact}`}>{contact}</a>.</p> : <p className="adminNotice">Support contact is not configured. Add SUPPORT_EMAIL before publishing this policy.</p>}
    <p>This policy needs review by the site owner to confirm the selected hosting and storage providers, retention periods, and contact details.</p>
  </article></div></PageShell>;
}
