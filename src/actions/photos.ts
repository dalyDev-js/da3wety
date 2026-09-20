"use server";

import { randomUUID } from "node:crypto";
import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { lockEvent } from "@/db/event-lock";
import { getEventForHost } from "@/db/queries/events";
import { getPhotosByIds } from "@/db/queries/photos";
import { photos, PHOTO_STATUSES, type PhotoStatus } from "@/db/schema";
import { requireHost } from "@/lib/auth";
import {
  ensureUploadSession,
  galleryState,
  getUploadSession,
  resolveGalleryRef,
  type GalleryRef,
} from "@/lib/gallery-access";
import { log } from "@/lib/log";
import { enforceRateLimit, RateLimitedError, requestIp } from "@/lib/rate-limit";
import {
  BUCKETS,
  createSignedUpload,
  validPhotoObject,
  PHOTO_MAX_BYTES,
  photoPaths,
  removeObjects,
  type SignedUpload,
} from "@/lib/storage";
import { z } from "@/lib/validation/zod-config";

const galleryRefSchema = z.object({ kind: z.enum(["slug", "token"]), value: z.string().min(8).max(32) });

const reserveInput = z.object({
  ref: galleryRefSchema,
  sizeBytes: z.number().int().positive().max(PHOTO_MAX_BYTES),
  thumbBytes: z.number().int().positive().max(PHOTO_MAX_BYTES),
  width: z.number().int().positive().max(10000),
  height: z.number().int().positive().max(10000),
  uploaderName: z.string().trim().max(80).optional(),
});

export type ReserveResult =
  | { ok: true; photoId: string; bucket: string; main: SignedUpload; thumb: SignedUpload }
  | { ok: false; reason: "closed" | "limit" | "rate" | "invalid" };

/** Step 1 of a guest upload: authorize, reserve a row, mint two signed upload URLs. */
export async function reservePhotoUpload(input: z.input<typeof reserveInput>): Promise<ReserveResult> {
  const parsed = reserveInput.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const ctx = await resolveGalleryRef(parsed.data.ref as GalleryRef);
  if (!ctx || galleryState(ctx) !== "open") return { ok: false, reason: "closed" };

  const session = await ensureUploadSession();
  try {
    await enforceRateLimit({ scope: "upload-session", subject: session, limit: 60, windowSeconds: 3600 });
    await enforceRateLimit({ scope: "upload-ip", subject: await requestIp(), limit: 120, windowSeconds: 3600 });
  } catch (error) {
    if (error instanceof RateLimitedError) return { ok: false, reason: "rate" };
    throw error;
  }

  const photoId = randomUUID();
  const paths = photoPaths(ctx.event.id, photoId);
  const reservation = await db.transaction(async (tx) => {
    const current = await lockEvent(tx, ctx.event.id);
    if (!current || galleryState(current) !== "open") return "closed" as const;
    const [total] = await tx.select({ value: count() }).from(photos).where(eq(photos.eventId, ctx.event.id));
    if (total.value >= current.pkg.maxPhotos) return "limit" as const;
    await tx
      .insert(photos)
      .values({
        id: photoId,
        eventId: ctx.event.id,
        guestId: ctx.guestId,
        uploaderName: parsed.data.uploaderName ?? ctx.guestName,
        uploadSession: session,
        ...paths,
        sizeBytes: parsed.data.sizeBytes,
        width: parsed.data.width,
        height: parsed.data.height,
        status: current.event.galleryModeration ? "pending" : "approved",
      })
      .returning({ id: photos.id });
    return null;
  });
  if (reservation) return { ok: false, reason: reservation };
  // Retain a failed reservation until cleanup: one token may already have been issued.
  const [main, thumb] = await Promise.all([
    createSignedUpload(BUCKETS.photos, paths.storagePath),
    createSignedUpload(BUCKETS.photos, paths.thumbPath),
  ]);
  return { ok: true, photoId, bucket: BUCKETS.photos, main, thumb };
}

/** Step 2: the browser reports both objects uploaded; verify and mark stored. */
export async function confirmPhotoUpload(ref: GalleryRef, photoId: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(photoId).success) return { ok: false };
  const ctx = await resolveGalleryRef(ref);
  const session = await getUploadSession();
  if (!ctx || !session || galleryState(ctx) !== "open") return { ok: false };

  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.eventId, ctx.event.id), eq(photos.uploadSession, session)))
    .limit(1);
  if (!photo) return { ok: false };
  if (photo.uploadState === "stored") return { ok: true };
  if (photo.createdAt.getTime() <= Date.now() - 2 * 3600_000) return { ok: false };

  const [mainOk, thumbOk] = await Promise.all([validPhotoObject(photo.storagePath), validPhotoObject(photo.thumbPath)]);
  if (!mainOk || !thumbOk) return { ok: false };

  const confirmed = await db.transaction(async (tx) => {
    const current = await lockEvent(tx, ctx.event.id);
    if (!current || galleryState(current) !== "open" || photo.createdAt.getTime() <= Date.now() - 2 * 3600_000)
      return false;
    const rows = await tx
      .update(photos)
      .set({ uploadState: "stored" })
      .where(and(eq(photos.id, photoId), eq(photos.uploadSession, session)))
      .returning({ id: photos.id });
    return rows.length === 1;
  });
  if (!confirmed) return { ok: false };
  revalidatePath(`/e/${ctx.event.slug}/gallery`);
  revalidatePath(`/dashboard/events/${ctx.event.id}/gallery`);
  return { ok: true };
}

/** A guest removes one of their own uploads (same browser session). */
export async function deleteOwnPhoto(ref: GalleryRef, photoId: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(photoId).success) return { ok: false };
  const ctx = await resolveGalleryRef(ref);
  const session = await getUploadSession();
  if (!ctx || !session) return { ok: false };

  const [photo] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.eventId, ctx.event.id), eq(photos.uploadSession, session)))
    .limit(1);
  if (!photo) return { ok: false };

  await removeObjects(BUCKETS.photos, [photo.storagePath, photo.thumbPath]);
  await db.delete(photos).where(eq(photos.id, photoId));
  revalidatePath(`/e/${ctx.event.slug}/gallery`);
  revalidatePath(`/dashboard/events/${ctx.event.id}/gallery`);
  return { ok: true };
}

const idList = z.array(z.uuid()).min(1).max(200);

/** Host moderation: approve / reject a batch. */
export async function moderatePhotos(eventId: string, ids: string[], status: PhotoStatus): Promise<void> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success || !idList.safeParse(ids).success || !PHOTO_STATUSES.includes(status))
    return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  await db
    .update(photos)
    .set({ status, moderatedAt: new Date(), moderatedBy: host.id })
    .where(and(eq(photos.eventId, eventId), inArray(photos.id, ids)));
  revalidatePath(`/e/${ctx.event.slug}/gallery`);
  revalidatePath(`/dashboard/events/${eventId}/gallery`);
}

/** Host deletes photos permanently (objects first, then rows). */
export async function deletePhotos(eventId: string, ids: string[]): Promise<void> {
  const host = await requireHost();
  if (!z.uuid().safeParse(eventId).success || !idList.safeParse(ids).success) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  const rows = await getPhotosByIds(eventId, ids);
  if (rows.length === 0) return;
  await removeObjects(BUCKETS.photos, rows.flatMap((p) => [p.storagePath, p.thumbPath]).filter(Boolean));
  await db.delete(photos).where(
    and(
      eq(photos.eventId, eventId),
      inArray(
        photos.id,
        rows.map((p) => p.id),
      ),
    ),
  );
  log.info("photos.delete", "host deleted photos", { eventId, count: rows.length });
  revalidatePath(`/e/${ctx.event.slug}/gallery`);
  revalidatePath(`/dashboard/events/${eventId}/gallery`);
}
