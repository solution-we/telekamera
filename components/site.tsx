import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { supportEmail } from "@/lib/config";

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return <Link className="wordmark" href="/" aria-label="TeleKamera home"><span className="wordmarkName">Tele<span>Kamera</span></span>{compact ? null : <small>your pocket studio</small>}</Link>;
}

export function SiteHeader() {
  return <header className="siteHeader"><div className="container headerInner">
    <Wordmark compact />
    <nav className="desktopNav" aria-label="Main navigation">
      <Link href="/#features">Features</Link><Link href="/#how-it-works">How it works</Link><Link href="/#screenshots">Screenshots</Link><Link href="/#faq">FAQ</Link><Link href="/downloads">Downloads</Link>
    </nav>
    <Link className="button buttonSmall buttonOutline headerDownload" href="/downloads"><Icon name="download" size={15}/> Download</Link>
    <details className="mobileNav"><summary aria-label="Open navigation"><Icon name="menu"/></summary><nav aria-label="Mobile navigation">
      <Link href="/#features">Features</Link><Link href="/#how-it-works">How it works</Link><Link href="/#screenshots">Screenshots</Link><Link href="/#faq">FAQ</Link><Link href="/downloads">Downloads</Link>
    </nav></details>
  </div></header>;
}

export function SiteFooter() {
  const contact = supportEmail();
  return <footer className="siteFooter"><div className="container footerTop">
    <div className="footerBrand"><Wordmark/><p>A small, thoughtful way to bring your phone camera to your PC.</p></div>
    <div className="footerLinks"><div><strong>Explore</strong><Link href="/#features">Features</Link><Link href="/#how-it-works">Setup guide</Link><Link href="/downloads">Downloads</Link><Link href="/downloads#archive">Release history</Link></div>
      <div><strong>Information</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>{contact ? <a href={`mailto:${contact}`}>Support</a> : <span className="muted">Support contact pending</span>}</div></div>
  </div><div className="container footerBottom"><span>© {new Date().getFullYear()} TeleKamera</span><span>Made for your everyday setup.</span></div></footer>;
}

export function PageShell({ children }: { children: ReactNode }) {
  return <><SiteHeader/><main>{children}</main><SiteFooter/></>;
}
