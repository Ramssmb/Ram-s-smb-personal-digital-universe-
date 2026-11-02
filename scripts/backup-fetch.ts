/**
 * Downloads the newest encrypted backup from the backup bucket to ./backups/
 * on this computer (the weekly local copy, docs/DEPLOYMENT_VERCEL.md §6).
 *
 *   npm run backup:fetch
 *
 * Needs BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID and
 * BACKUP_S3_SECRET_ACCESS_KEY (read-only credentials are enough), e.g. in .env.
 * The file stays encrypted; decrypting it needs your age private key.
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { AwsClient } from "aws4fetch";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Set ${name} (see docs/DEPLOYMENT_VERCEL.md §6).`);
    process.exit(1);
  }
  return value;
}

const endpoint = required("BACKUP_S3_ENDPOINT").replace(/\/+$/, "");
const bucket = required("BACKUP_S3_BUCKET");
const client = new AwsClient({
  accessKeyId: required("BACKUP_S3_ACCESS_KEY_ID"),
  secretAccessKey: required("BACKUP_S3_SECRET_ACCESS_KEY"),
  region: process.env.BACKUP_S3_REGION?.trim() || "auto",
  service: "s3",
});
const base = `${endpoint}/${encodeURIComponent(bucket)}`;

async function listBackups(): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const url = new URL(base);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", "backups/");
    if (token) url.searchParams.set("continuation-token", token);
    const response = await client.fetch(url.toString());
    if (!response.ok) throw new Error(`Listing backups failed with HTTP ${response.status}.`);
    const xml = await response.text();
    for (const match of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(match[1]!);
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1]
      : undefined;
  } while (token);
  return keys.filter((key) => /^backups\/site-backup-\d{8}T\d{6}Z\.tar\.gz\.age$/.test(key)).sort();
}

const keys = await listBackups();
const newest = keys.at(-1);
if (!newest) {
  console.error("No backups found yet.");
  process.exit(1);
}

const target = join("backups", newest.slice("backups/".length));
const exists = await stat(target).then(
  () => true,
  () => false,
);
if (exists) {
  console.log(`Already downloaded: ${target}`);
  process.exit(0);
}

const response = await client.fetch(`${base}/${newest}`);
if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}.`);
await mkdir("backups", { recursive: true });
await writeFile(target, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
console.log(`Saved ${target} (${keys.length} backups in the bucket).`);
