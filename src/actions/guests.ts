"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { db } from "@/db";
import { countGuests, getEventForHost } from "@/db/queries/events";
import { getGuestForEvent } from "@/db/queries/guests";
import { guests } from "@/db/schema";
import { requireHost } from "@/lib/auth";
import { log } from "@/lib/log";
import { guestToken } from "@/lib/tokens";
import { validationError } from "@/lib/validation/action-errors";
import type { ActionState } from "@/lib/validation/form";
import { guestFormFromFormData, guestFormSchema, parseBulkGuests } from "@/lib/validation/guest";
import { z } from "@/lib/validation/zod-config";

const uuid = z.uuid();

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}

async function guestCapacityLeft(eventId: string, maxGuests: number | null): Promise<number> {
  if (maxGuests === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, maxGuests - (await countGuests(eventId)));
}

function revalidateGuests(eventId: string) {
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  revalidatePath("/dashboard");
}

export async function addGuest(eventId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success) return { status: "error" };
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return { status: "error" };

  const parsed = guestFormSchema.safeParse(guestFormFromFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  const t = await getTranslations("Guests");

  if ((await guestCapacityLeft(eventId, ctx.pkg.maxGuests)) < 1) {
    return { status: "error", formError: t("limitReached", { max: ctx.pkg.maxGuests ?? 0 }) };
  }

  try {
    await db.insert(guests).values({
      eventId,
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      maxSeats: parsed.data.maxSeats,
      groupLabel: parsed.data.groupLabel ?? null,
      notes: parsed.data.notes ?? null,
      token: guestToken(),
      source: "host",
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "error", fieldErrors: { phone: [t("phoneExists")] } };
    throw error;
  }

  revalidateGuests(eventId);
  return { status: "success", message: t("added") };
}

export async function updateGuest(eventId: string, guestId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success || !uuid.safeParse(guestId).success) return { status: "error" };
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx || !(await getGuestForEvent(guestId, eventId))) return { status: "error" };

  const parsed = guestFormSchema.safeParse(guestFormFromFormData(formData));
  if (!parsed.success) return validationError(parsed.error);
  const t = await getTranslations("Guests");

  try {
    await db
      .update(guests)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        maxSeats: parsed.data.maxSeats,
        groupLabel: parsed.data.groupLabel ?? null,
        notes: parsed.data.notes ?? null,
      })
      .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "error", fieldErrors: { phone: [t("phoneExists")] } };
    throw error;
  }

  revalidateGuests(eventId);
  return { status: "success", message: t("saved") };
}

export type BulkAddResult = ActionState<{ added: number; skipped: number; lineErrors: { line: number; message: string }[] }>;

export async function addGuestsBulk(eventId: string, _prev: BulkAddResult, formData: FormData): Promise<BulkAddResult> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success) return { status: "error" };
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return { status: "error" };

  const [t, tv] = await Promise.all([getTranslations("Guests"), getTranslations("Validation")]);
  const text = String(formData.get("lines") ?? "");
  const { guests: parsedGuests, errors } = parseBulkGuests(text);
  const lineErrors = errors.map((e) => ({ line: e.line, message: tv(e.key as "invalid") }));

  if (parsedGuests.length === 0) {
    return {
      status: "error",
      formError: t("bulkNothing"),
      fieldErrors: { lines: lineErrors.map((e) => t("lineError", { line: e.line, message: e.message })) },
    };
  }

  const capacity = await guestCapacityLeft(eventId, ctx.pkg.maxGuests);
  const toInsert = parsedGuests.slice(0, Number.isFinite(capacity) ? capacity : parsedGuests.length);
  let added = 0;
  let skipped = parsedGuests.length - toInsert.length;

  // One row at a time so a duplicate phone skips only that guest.
  for (const g of toInsert) {
    try {
      await db.insert(guests).values({
        eventId,
        name: g.name,
        phone: g.phone ?? null,
        maxSeats: g.maxSeats,
        groupLabel: g.groupLabel ?? null,
        token: guestToken(),
        source: "host",
      });
      added++;
    } catch (error) {
      if (isUniqueViolation(error)) {
        skipped++;
        lineErrors.push({ line: g.line, message: t("phoneExists") });
      } else {
        throw error;
      }
    }
  }

  log.info("guests.bulk", "bulk add", { eventId, added, skipped, invalid: errors.length });
  revalidateGuests(eventId);
  return { status: "success", data: { added, skipped, lineErrors }, message: t("bulkAdded", { added }) };
}

export async function deleteGuest(eventId: string, guestId: string): Promise<void> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success || !uuid.safeParse(guestId).success) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  await db.delete(guests).where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  revalidateGuests(eventId);
}

export async function markInviteSent(eventId: string, guestId: string): Promise<void> {
  const host = await requireHost();
  if (!uuid.safeParse(eventId).success || !uuid.safeParse(guestId).success) return;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) return;
  await db
    .update(guests)
    .set({ inviteSentAt: new Date() })
    .where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)));
  revalidateGuests(eventId);
}
