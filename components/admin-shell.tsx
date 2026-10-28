import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/site";
import { AdminLogoutButton } from "@/components/admin";
import { Icon } from "@/components/icon";

export function AdminFrame({ children, active }: { children: ReactNode; active: "overview" | "releases" | "settings" }) {
  return <div className="adminPage"><div className="adminLayout">
    <header className="adminHeader"><Wordmark compact/><div className="adminHeaderActions"><Link href="/" className="button buttonOutline buttonSmall">View website</Link><AdminLogoutButton/></div></header>
    <main className="adminMain"><div className="adminShell"><nav className="adminSidebar" aria-label="Administrator navigation">
      <strong>Workspace</strong><Link className={active === "overview" ? "active" : ""} href="/admin"><Icon name="grid" size={17}/> Overview</Link><Link className={active === "releases" ? "active" : ""} href="/admin/releases"><Icon name="download" size={17}/> Releases</Link><Link className={active === "settings" ? "active" : ""} href="/admin/settings"><Icon name="settings" size={17}/> Account settings</Link>
    </nav><div>{children}</div></div></main>
  </div></div>;
}
