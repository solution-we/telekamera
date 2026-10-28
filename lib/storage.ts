import "server-only";
import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { maxUploadBytes, requireEnvironment } from "@/lib/config";
import type { InstallerFormat } from "@/lib/types";

let client: S3Client | undefined;

function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: requireEnvironment("S3_ENDPOINT"),
      forcePathStyle: true,
      credentials: {
        accessKeyId: requireEnvironment("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnvironment("S3_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

const bucket = () => requireEnvironment("S3_BUCKET");

export function contentTypeFor(format: InstallerFormat) {
  if (format === "apk") return "application/vnd.android.package-archive";
  if (format === "exe") return "application/vnd.microsoft.portable-executable";
  return "application/x-msi";
}

export async function createUploadUrl(key: string, format: InstallerFormat) {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentTypeFor(format),
  });
  return getSignedUrl(s3(), command, { expiresIn: 600 });
}

export async function inspectObject(key: string) {
  const result = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
  return { fileSize: Number(result.ContentLength || 0), contentType: result.ContentType || "" };
}

export async function readObjectPrefix(key: string, length = 16) {
  const result = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: `bytes=0-${length - 1}` }));
  if (!result.Body) throw new Error("Uploaded file is empty.");
  return Buffer.from(await result.Body.transformToByteArray());
}

export async function hashObject(key: string) {
  const result = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!result.Body) throw new Error("Uploaded file is empty.");
  const hash = createHash("sha256");
  let size = 0;
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength;
    if (size > maxUploadBytes()) throw new Error("Uploaded file exceeds the configured size limit.");
    hash.update(chunk);
  }
  return { fileSize: size, sha256: hash.digest("hex") };
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function createDownloadUrl(key: string, contentType: string, disposition: string) {
  const command = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    ResponseContentType: contentType,
    ResponseContentDisposition: disposition,
    ResponseCacheControl: "private, no-store, max-age=0",
    ResponseContentEncoding: "identity",
  });
  return getSignedUrl(s3(), command, { expiresIn: 180 });
}

export { validFileSignature } from "@/lib/file-security";
