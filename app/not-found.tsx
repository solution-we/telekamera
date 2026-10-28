import Link from "next/link";
import { PageShell } from "@/components/site";

export default function NotFound() {
  return <PageShell><section className="container legalPage"><article><span className="eyebrow">404 · NOT FOUND</span><h1>That page isn&apos;t here.</h1><p>Check the link or return to the TeleKamera downloads page.</p><Link className="button buttonPrimary" href="/downloads">Browse downloads</Link></article></section></PageShell>;
}
