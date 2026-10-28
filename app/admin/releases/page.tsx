import { AdminFrame } from "@/components/admin-shell";
import { ReleaseManager } from "@/components/admin";
import { requireAdminPage } from "@/lib/auth";
import { getAdminReleases } from "@/lib/releases";

export const metadata = { title: "Manage releases", robots: { index: false, follow: false } };

export default async function AdminReleasesPage() {
  await requireAdminPage();
  const releases = await getAdminReleases();
  return <AdminFrame active="releases"><div className="adminTitleRow"><div><span className="eyebrow">SOFTWARE CATALOG</span><h1>Manage releases</h1><p>Upload a new installer or update release visibility and notes.</p></div></div><ReleaseManager initialReleases={releases}/></AdminFrame>;
}
