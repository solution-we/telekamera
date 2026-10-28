export type Platform = "android" | "windows";
export type ReleaseChannel = "stable" | "beta" | "prerelease";
export type ReleaseStatus = "draft" | "published" | "unpublished" | "archived";
export type InstallerFormat = "apk" | "exe" | "msi";

export type ReleaseBinary = {
  id: string;
  installer_format: InstallerFormat;
  original_filename: string;
  file_size: number;
  sha256: string;
  content_type: string;
};

export type ReleaseRecord = {
  id: string;
  platform: Platform;
  version: string;
  build_number: string;
  channel: ReleaseChannel;
  status: ReleaseStatus;
  release_notes: string;
  release_date: string;
  minimum_os: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  release_binaries?: ReleaseBinary[];
};

export type PublicRelease = Pick<ReleaseRecord,
  "id" | "platform" | "version" | "build_number" | "channel" | "release_notes" | "release_date" | "minimum_os" | "published_at"
> & { binaries: ReleaseBinary[] };
