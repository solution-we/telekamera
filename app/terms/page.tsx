import type { Metadata } from "next";
import { PageShell } from "@/components/site";
import { supportEmail } from "@/lib/config";

export const metadata: Metadata = { title: "Terms of use", description: "Terms for using the TeleKamera website and release downloads.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  const contact = supportEmail();
  return <PageShell><div className="container legalPage"><article><span className="eyebrow">TELEKAMERA</span><h1>Terms of use</h1><p className="updated">Owner review required before launch</p>
    <p>These draft terms cover use of this website and the TeleKamera release downloads. They are a starting point and require owner and legal review before public launch.</p>
    <h2>Software downloads</h2><p>Download only releases identified as published on this website. Review the applicable release notes and device requirements before installing. You are responsible for deciding whether a release is suitable for your devices and environment.</p>
    <h2>Availability and changes</h2><p>Website content and downloads may change or become unavailable. Published release metadata identifies the files offered at the time of publication; always verify the SHA-256 checksum after download when your operating system or deployment process supports verification.</p>
    <h2>Acceptable use</h2><p>Do not attempt to access administrator accounts, unpublished releases, or private file storage without authorization. Do not disrupt the site or interfere with another person&apos;s use of it.</p>
    <h2>Contact</h2>{contact ? <p>Questions about these draft terms: <a href={`mailto:${contact}`}>{contact}</a>.</p> : <p className="adminNotice">Support contact is not configured. Add SUPPORT_EMAIL before publishing these terms.</p>}
    <p>The site owner must review these terms and add any required jurisdiction, licensing, warranty, and liability language before launch.</p>
  </article></div></PageShell>;
}
