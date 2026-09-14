import "server-only";

import { customAlphabet } from "nanoid";

import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export const BUCKETS = {
  /** Public: host-uploaded cover / reveal images; survive gallery cleanup. */
  assets: "event-assets",
  /** Private: guest gallery uploads; purged after the retention window. */
  photos: "event-photos",
} as const;

export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

export const ASSET_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const suffix = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

/** Unique path per upload so CDN / next-image caches never serve a stale image. */
export function assetPath(eventId: string, kind: "cover" | "reveal"): string {
  return `${eventId}/${kind}-${suffix()}.jpg`;
}

export function photoPaths(eventId: string, photoId: string) {
  return {
    storagePath: `${eventId}/${photoId}.jpg`,
    thumbPath: `${eventId}/thumbs/${photoId}.jpg`,
  };
}

export function publicAssetUrl(path: string): string {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKETS.assets}/${path}`;
}

/** Guards that a path stays inside the event's folder. */
export function pathBelongsToEvent(path: string, eventId: string): boolean {
  return path.startsWith(`${eventId}/`) && !path.includes("..");
}

export type SignedUpload = { path: string; token: string };

/** Mints a direct-to-storage upload token (valid 2h). Callers authorize first. */
export async function createSignedUpload(bucket: Bucket, path: string): Promise<SignedUpload> {
  const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`createSignedUploadUrl failed: ${error?.message ?? "unknown"}`);
  return { path: data.path, token: data.token };
}

/** Rounds the expiry up to the next hour so identical URLs are produced within the hour (cacheable). */
export function signedUrlTtlSeconds(now = new Date()): number {
  const nextHour = new Date(now);
  nextHour.setUTCMinutes(0, 0, 0);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);
  // At least 30 minutes so a page opened at :59 still works for a while.
  return Math.max(1800, Math.round((nextHour.getTime() - now.getTime()) / 1000) + 1800);
}

export async function createSignedReadUrls(
  bucket: Bucket,
  paths: string[],
  options: { download?: boolean } = {},
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;
  const { data, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrls(paths, signedUrlTtlSeconds(), options.download ? { download: true } : undefined);
  if (error || !data) throw new Error(`createSignedUrls failed: ${error?.message ?? "unknown"}`);
  for (const item of data) {
    if (item.signedUrl && item.path) result.set(item.path, item.signedUrl);
  }
  return result;
}

export async function objectExists(bucket: Bucket, path: string): Promise<boolean> {
  const { data, error } = await createAdminClient().storage.from(bucket).exists(path);
  if (error) return false;
  return Boolean(data);
}

/** remove() accepts at most 1000 paths per call. */
export async function removeObjects(bucket: Bucket, paths: string[]): Promise<number> {
  let removed = 0;
  for (let i = 0; i < paths.length; i += 1000) {
    const chunk = paths.slice(i, i + 1000);
    const { data, error } = await createAdminClient().storage.from(bucket).remove(chunk);
    if (error) throw new Error(`remove failed: ${error.message}`);
    removed += data?.length ?? 0;
  }
  return removed;
}

/** Lists every object under a prefix (offset pagination; folder rows have id === null). */
export async function listObjectPaths(bucket: Bucket, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const limit = 100;
  let offset = 0;
  for (;;) {
    const { data, error } = await createAdminClient().storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw new Error(`list failed: ${error.message}`);
    const files = (data ?? []).filter((o) => o.id !== null);
    paths.push(...files.map((o) => `${prefix}/${o.name}`));
    if (!data || data.length < limit) break;
    offset += limit;
  }
  return paths;
}

/**
 * Deletes everything an event stored in a bucket: the event folder and its thumbs
 * subfolder. Idempotent; returns the number of objects removed.
 */
export async function purgeEventFolder(bucket: Bucket, eventId: string): Promise<number> {
  const paths = [...(await listObjectPaths(bucket, `${eventId}/thumbs`)), ...(await listObjectPaths(bucket, eventId))];
  if (paths.length === 0) return 0;
  return removeObjects(bucket, paths);
}
