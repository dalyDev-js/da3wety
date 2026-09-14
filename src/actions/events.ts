"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { getEventForHost } from "@/db/queries/events";
import { getPackage } from "@/db/queries/packages";
import { EVENT_STATUSES, events, type Event, type EventStatus } from "@/db/schema";
import { requireHost } from "@/lib/auth";
import { computeGalleryExpiresAt } from "@/lib/dates";
import { log } from "@/lib/log";
import { assertFeature } from "@/lib/packages";
import {
  ASSET_MAX_BYTES,
  assetPath,
  BUCKETS,
  createSignedUpload,
  IMAGE_MIME_TYPES,
  pathBelongsToEvent,
  purgeEventFolder,
  type SignedUpload,
} from "@/lib/storage";
import { slug as makeSlug } from "@/lib/tokens";
import { domainError, validationError } from "@/lib/validation/action-errors";
import { eventFormFromFormData, eventFormSchema, type EventFormValues } from "@/lib/validation/event";
import type { ActionState } from "@/lib/validation/form";
import { z } from "@/lib/validation/zod-config";

const uuid = z.uuid();

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"
  );
}

/** Insert with a fresh slug; retries on the (astronomically rare) slug collision. */
async function insertWithSlug(values: Omit<typeof events.$inferInsert, "slug">): Promise<Event> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(events)
        .values({ ...values, slug: makeSlug() })
        .returning();
      if (row) return row;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
    }
  }
  throw new Error("unreachable");
}

function galleryExpiry(values: Pick<EventFormValues, "startsAt" | "endsAt">, retentionDays: number) {
  return computeGalleryExpiresAt({ startsAt: values.startsAt, endsAt: values.endsAt, retentionDays });
}

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const host = await requireHost();
  const parsed = eventFormSchema.safeParse(eventFormFromFormData(formData));
  if (!parsed.success) return validationError(parsed.error);

  const values = parsed.data;
  const pkg = await getPackage("basic");
  // New events start on Basic: gallery/moderation cannot be on yet.
  const created = await insertWithSlug({
    hostId: host.id,
    packageTier: "basic",
    eventType: values.eventType,
    title: values.title,
    honoreePrimary: values.honoreePrimary,
    honoreeSecondary: values.honoreeSecondary,
    familyNames: values.familyNames,
    description: values.description,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
    timezone: values.timezone,
    venueName: values.venueName,
    venueAddress: values.venueAddress,
    venueMapsUrl: values.venueMapsUrl,
    locale: values.locale,
    rsvpMode: values.rsvpMode,
    rsvpDeadline: values.rsvpDeadline,
    openRsvpMaxSeats: values.openRsvpMaxSeats,
    galleryEnabled: false,
    galleryModeration: false,
    galleryExpiresAt: galleryExpiry(values, pkg.photoRetentionDays),
  });

  log.info("events.create", "event created", { eventId: created.id, hostId: host.id });
  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${created.id}/edit?created=1`);
}

export async function updateEvent(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success) return { status: "error" };
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return { status: "error" };

  const parsed = eventFormSchema.safeParse(eventFormFromFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  const values = parsed.data;

  for (const path of [values.coverImagePath, values.revealImagePath]) {
    if (path && !pathBelongsToEvent(path, eventId)) return { status: "error" };
  }

  try {
    if (values.galleryEnabled) assertFeature(ctx.pkg, "gallery");
    if (values.galleryModeration) assertFeature(ctx.pkg, "moderation");
  } catch (error) {
    return domainError(error);
  }

  await db
    .update(events)
    .set({
      eventType: values.eventType,
      title: values.title,
      honoreePrimary: values.honoreePrimary,
      honoreeSecondary: values.honoreeSecondary,
      familyNames: values.familyNames,
      description: values.description,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      timezone: values.timezone,
      venueName: values.venueName,
      venueAddress: values.venueAddress,
      venueMapsUrl: values.venueMapsUrl,
      locale: values.locale,
      rsvpMode: values.rsvpMode,
      rsvpDeadline: values.rsvpDeadline,
      openRsvpMaxSeats: values.openRsvpMaxSeats,
      galleryEnabled: values.galleryEnabled,
      galleryModeration: values.galleryModeration,
      coverImagePath: values.coverImagePath,
      revealImagePath: values.revealImagePath,
      galleryExpiresAt: galleryExpiry(values, ctx.pkg.photoRetentionDays),
    })
    .where(and(eq(events.id, eventId), eq(events.hostId, host.id)));

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  revalidatePath(`/e/${ctx.event.slug}`, "layout");
  return { status: "success" };
}

export async function setEventStatus(eventId: string, status: EventStatus): Promise<void> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success || !EVENT_STATUSES.includes(status)) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  await db
    .update(events)
    .set({ status })
    .where(and(eq(events.id, eventId), eq(events.hostId, host.id)));
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  revalidatePath(`/e/${ctx.event.slug}`, "layout");
}

/** Storage first (no cascade into Storage), then the row (cascades to guests, photos, …). */
export async function deleteEvent(eventId: string): Promise<never | void> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;

  const removedPhotos = await purgeEventFolder(BUCKETS.photos, eventId);
  const removedAssets = await purgeEventFolder(BUCKETS.assets, eventId);
  await db.delete(events).where(and(eq(events.id, eventId), eq(events.hostId, host.id)));
  log.info("events.delete", "event deleted", { eventId, removedPhotos, removedAssets });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const assetUploadInput = z.object({
  eventId: z.uuid(),
  kind: z.enum(["cover", "reveal"]),
  mimeType: z.enum(IMAGE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(ASSET_MAX_BYTES),
});

export type AssetUploadResult = { ok: true; bucket: string; upload: SignedUpload } | { ok: false };

/** Mints a signed upload for a cover/reveal image after checking ownership. */
export async function createAssetUpload(input: z.input<typeof assetUploadInput>): Promise<AssetUploadResult> {
  const host = await requireHost();
  const parsed = assetUploadInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  const ctx = await getEventForHost(parsed.data.eventId, host.id);
  if (!ctx) return { ok: false };

  const upload = await createSignedUpload(BUCKETS.assets, assetPath(parsed.data.eventId, parsed.data.kind));
  return { ok: true, bucket: BUCKETS.assets, upload };
}
