# TeleKamera website

A public TeleKamera product site, database-backed release archive, direct download routes, and a protected administrator area. The public interface follows the supplied Obsidian Glass reference. Its device previews are labelled interface design placeholders because the source attachment is a website reference, not real Android or Windows screenshots.

## Architecture

- **Next.js App Router + TypeScript** renders the public pages and hosts the administrator and download endpoints.
- **Administrator access** uses a numeric code stored as a one-way database hash, a signed 12-hour HTTP-only session cookie, and a 30-minute lockout after three incorrect attempts from the same IP. Failed attempts are recorded as suspicious activity with only a hashed IP address.
- **Supabase PostgreSQL** stores administrator profiles, release metadata, installer metadata, pending uploads, rate-limit buckets, and audit events. SQL migrations enable row-level security; anonymous database access can read only published release fields and binary metadata. Storage keys and admin records are not granted to anonymous roles.
- **Private S3-compatible object storage** holds the installer files. The application signs short-lived direct uploads for authenticated admins, verifies each completed object, streams it through the server to calculate SHA-256, and stores it under a random server-generated key. Downloads first pass through a release-status check and then redirect to a three-minute signed object URL with a safe attachment filename.
- **Stable Android and Windows selection is independent.** Beta and pre-release builds do not enter the latest Stable routes. Public pages use records from PostgreSQL and show a disabled “Coming soon” state when no matching release exists.

No release files or real credentials belong in the repository. External services are required before administrator access, uploads, or downloads can work.

## Local setup

Requirements: Node.js 20.9 or later, npm, a Supabase project, and a private S3-compatible bucket. For local work, use a private `.env.local`; it is ignored by Git.

1. Install the dependencies:

   ```sh
   npm install
   ```

2. Create a Supabase project. Apply the SQL files in `database/migrations/` in order using the Supabase SQL editor or your migration workflow. The first migration creates the schema and login rate-limit functions. The second adds transactional upload finalization. The third adds hashed numeric-code storage and the three-attempt lockout.

3. Create a **private** S3-compatible bucket. Disable public listing and public object reads. Configure provider-side encryption at rest and least-privilege credentials for this application. Restrict CORS to your local and production website origins, allow `PUT`, and allow the `Content-Type` request header. The signed upload expires after ten minutes. Set a storage-side maximum object size that matches `MAX_UPLOAD_BYTES` where supported.

4. Keep `.env.local` out of version control. Add the Supabase project URL and service-role key; S3 endpoint, region, bucket, access key and secret; and a random `AUTH_RATE_LIMIT_SECRET` with at least 32 characters. `.env.example` is a reference only. Never use a service-role key or S3 secret in a `NEXT_PUBLIC_` variable.

5. Run `npm run bootstrap:admin` once to initialize the internal administrator profile used for release ownership and audit records. It creates a random database ID; it does not create a Supabase Auth user, and there is no email/password sign-in form.

6. Set `ADMIN_NUMERIC_CODE=2008` as a Vercel Secret for first access. The code is hashed into the database on its first successful use after migration 003. Remove `ADMIN_NUMERIC_CODE` after that first successful login; the stored hash remains active and you can change the code from Admin → Access code.

7. Start the local website:

   ```sh
   npm run dev
   ```

   Public routes are `/`, `/downloads`, `/privacy`, and `/terms`. Administrator routes are `/admin/login`, `/admin`, and `/admin/releases`.

## Environment variables

See `.env.example` for the complete variable list. The required runtime values are:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, Open Graph metadata, sitemap, and same-origin request checks. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database and internal administrator profile setup. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET` | Private S3-compatible object storage location. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Server-only storage credentials. |
| `AUTH_RATE_LIMIT_SECRET` | HMAC key for signed admin sessions, PIN lockout keys, and minimized IP audit fields. |
| `MAX_UPLOAD_BYTES` | Maximum server-accepted installer size; defaults to 2 GiB. |
| `SUPPORT_EMAIL` | Optional real public contact address. Privacy and terms pages show a setup notice until configured. |

`ADMIN_NUMERIC_CODE` is only needed until the first successful PIN login. The admin can set a different 1–12 digit code in the dashboard.

## Upload and release workflow

Administrators enter the numeric code at `/admin/login`. After three incorrect attempts from the same IP, access is locked for 30 minutes and the attempts are recorded as suspicious. New uploads are sent directly from the browser to private object storage through a short-lived signed `PUT` URL, so the application server does not receive a multi-gigabyte request body. The server then checks the actual object length and content type, inspects the expected APK/EXE/MSI file signature, streams the stored object to calculate SHA-256, and finalizes the release and binary metadata in one database transaction. New releases start as drafts.

To add both Windows formats to one release, upload the EXE and MSI with the same platform, version, build number, and channel. An upload of the same format to that release replaces the binary only after the new object passes validation. Publish only after confirming the release notes and metadata. Unpublishing or archiving removes the release from public listings and blocks its controlled download route. A published release must first be unpublished or archived before it can be deleted.

The file signature check is an additional format sanity check; it is not malware scanning. Review installers before publication and use an independent scanning process appropriate to the distribution environment.

## Tests and checks

Automated unit tests cover independent latest-Stable selection and installer signature checks. Run:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

These checks do not replace an end-to-end test with a configured Supabase project and private storage bucket. Verify that an admin can upload a test installer, see a draft, publish it, download it through the public route, and compare the downloaded SHA-256 with the administrator record. Also verify that a draft or unpublished release returns not found.

## Production deployment

1. Create production Supabase and S3-compatible storage resources. Keep the bucket private; enable provider encryption at rest and backups. Restrict database and object-storage credentials to the application server and set provider upload limits to the configured maximum.
2. Apply `database/migrations/` in order to the production database.
3. Add the runtime environment variables in the hosting provider's server-side secret configuration. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain. Do not add service-role, bootstrap, or storage secret values to public build variables.
4. Configure the production storage bucket's CORS origin to the final site origin, with `PUT` and `Content-Type`. Restrict the application's storage credentials to the release bucket.
5. Run `npm run bootstrap:admin` from a trusted environment connected to the production project. Set `ADMIN_NUMERIC_CODE` to `2008` in Vercel Production for the first login, then remove that variable after the first successful sign-in. The code is saved as a hash in Supabase; change it from Admin → Access code at any time.
6. Deploy the Next.js application to Vercel or another Node-compatible host. Use persistent external PostgreSQL and object storage; the app's local filesystem is never used for release binaries. Configure the production domain and HTTPS.
7. Verify PIN access, the three-attempt/30-minute lockout, suspicious-attempt audit records, draft privacy, independent latest Stable releases, historical release links, signed uploads, checksum validation, and actual downloads. A download route redirects only after checking that the database record is published; the object itself remains private.
8. Enable provider database and object-storage backups. Document owner-approved retention and recovery procedures and test restoring a database snapshot and stored release files.
9. Set a real `SUPPORT_EMAIL`, review the privacy policy and terms with the owner, and verify the selected providers' logging and retention behavior before launch.
10. In Google Search Console, verify the production domain and submit `https://your-domain.example/sitemap.xml` using the real domain. Indexing and search placement are controlled by search engines and are not guaranteed.

## External setup still required

This workspace does not contain Supabase or storage credentials, an initialized remote database, a private storage bucket, or production release binaries. Apply the migrations and configure those services before PIN sign-in, upload, and download flows can be exercised end to end. The privacy and terms pages explicitly request owner review, and product preview art must be replaced with genuine app screenshots when available.
