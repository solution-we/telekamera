import type { Metadata } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "TeleKamera — Your pocket studio", template: "%s · TeleKamera" },
  description: "Turn your Android phone into a webcam for your Windows PC with TeleKamera.",
  openGraph: { type: "website", siteName: "TeleKamera", title: "TeleKamera — Your pocket studio", description: "Turn your Android phone into a webcam for your Windows PC." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
