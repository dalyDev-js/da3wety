"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { db, type Transaction } from "@/db";
import { getEventByGuestToken, getEventBySlug, type EventWithPackage } from "@/db/queries/events";
import { guestCapacityLeft, lockEvent } from "@/db/event-lock";
import { guests, rsvps, type Event, type Package, type RsvpStatus } from "@/db/schema";
import { toIntlLocale, type AppLocale } from "@/lib/i18n/config";
import { log } from "@/lib/log";
import { packageAllows } from "@/lib/packages";
import { enforceRateLimit, RateLimitedError, requestIp } from "@/lib/rate-limit";
import { ensureActiveTicket, revokeActiveTicket } from "@/lib/tickets";
import { guestToken as makeGuestToken, GUEST_TOKEN_RE, SLUG_RE } from "@/lib/tokens";
import { domainError, validationError } from "@/lib/validation/action-errors";
import type { ActionState } from "@/lib/validation/form";
import {
  openRsvpFromFormData,
  openRsvpSchema,
  personalRsvpFromFormData,
  personalRsvpSchema,
} from "@/lib/validation/rsvp";
import { VALIDATION_KEYS } from "@/lib/validation/zod-config";

export type RsvpActionState = ActionState<{ status: RsvpStatus }>;

async function rsvpTranslations(locale: AppLocale) {
  return getTranslations({ locale: toIntlLocale(locale), namespace: "Rsvp" });
}

/** Whether the invitation still accepts answers. */
function rsvpOpen(event: Event): boolean {
  if (event.status !== "published") return false;
  if (event.rsvpDeadline && event.rsvpDeadline.getTime() < Date.now()) return false;
  return true;
}

/**
 * Writes the response, keeps the ticket in sync with the answer, and returns the
 * stored status. Shared by both entry points.
 */
async function recordResponse(
  tx: Transaction,
  ctx: { event: Event; pkg: Package },
  guestId: string,
  input: { status: RsvpStatus; seats: number; message: string | null },
): Promise<RsvpStatus> {
  const seats = input.status === "attending" ? input.seats : 0;
  await tx
    .insert(rsvps)
    .values({
      eventId: ctx.event.id,
      guestId,
      status: input.status,
      seats,
      message: input.message,
      respondedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: rsvps.guestId,
      set: {
        status: input.status,
        seats,
        message: input.message,
        respondedAt: new Date(),
        responseCount: sql`${rsvps.responseCount} + 1`,
      },
    });

  if (input.status === "attending" && packageAllows(ctx.pkg, "checkin")) {
    await ensureActiveTicket(tx, ctx.event.id, guestId);
  } else if (input.status === "declined") {
    await revokeActiveTicket(tx, guestId);
  }
  return input.status;
}

function revalidateAfterRsvp(ctx: EventWithPackage, token?: string) {
  revalidatePath(`/e/${ctx.event.slug}`);
  if (token) revalidatePath(`/i/${token}`);
  revalidatePath(`/dashboard/events/${ctx.event.id}`, "layout");
}

/** Guest with a personal link (/i/<token>). */
export async function submitPersonalRsvp(
  token: string,
  _prev: RsvpActionState,
  formData: FormData,
): Promise<RsvpActionState> {
  if (!GUEST_TOKEN_RE.test(token)) return { status: "error" };
  const ctx = await getEventByGuestToken(token);
  if (!ctx) return { status: "error" };
  const locale = ctx.event.locale;
  const t = await rsvpTranslations(locale);
  if (!rsvpOpen(ctx.event)) return { status: "error", formError: t("closed") };

  const parsed = personalRsvpSchema.safeParse(personalRsvpFromFormData(formData));
  if (!parsed.success) return validationError(parsed.error, locale);
  if (parsed.data.status === "attending" && parsed.data.seats > ctx.guest.maxSeats) {
    const tv = await getTranslations({ locale: toIntlLocale(locale), namespace: "Validation" });
    return { status: "error", fieldErrors: { seats: [tv(VALIDATION_KEYS.seatsExceeded)] } };
  }

  try {
    await enforceRateLimit({ scope: "rsvp-personal", subject: token, limit: 20, windowSeconds: 3600 });
    const status = await db.transaction(async (tx) => {
      const current = await lockEvent(tx, ctx.event.id);
      if (!current || !rsvpOpen(current.event)) throw new RsvpClosedError();
      const [guest] = await tx.select().from(guests).where(eq(guests.id, ctx.guest.id)).for("update");
      if (!guest || (parsed.data.status === "attending" && parsed.data.seats > guest.maxSeats)) {
        throw new RsvpClosedError();
      }
      return recordResponse(tx, current, guest.id, {
        status: parsed.data.status,
        seats: parsed.data.seats,
        message: parsed.data.message ?? null,
      });
    });
    log.info("rsvp.personal", "response recorded", { eventId: ctx.event.id, guestId: ctx.guest.id, status });
    revalidateAfterRsvp(ctx, token);
    return { status: "success", data: { status } };
  } catch (error) {
    if (error instanceof RsvpClosedError) return { status: "error", formError: t("closed") };
    if (error instanceof RateLimitedError) return domainError(error, locale);
    throw error;
  }
}

/** Self-registration through the open public link (/e/<slug>). Redirects to the new personal link. */
export async function submitOpenRsvp(
  slug: string,
  _prev: RsvpActionState,
  formData: FormData,
): Promise<RsvpActionState> {
  if (!SLUG_RE.test(slug)) return { status: "error" };
  const ctx = await getEventBySlug(slug);
  if (!ctx) return { status: "error" };
  const locale = ctx.event.locale;
  const t = await rsvpTranslations(locale);
  if (!rsvpOpen(ctx.event) || ctx.event.rsvpMode !== "open") return { status: "error", formError: t("closed") };

  const parsed = openRsvpSchema.safeParse(openRsvpFromFormData(formData));
  if (!parsed.success) {
    // Honeypot filled: behave like success without storing anything.
    if (parsed.error.issues.some((i) => i.path[0] === "website"))
      return { status: "success", data: { status: "attending" } };
    return validationError(parsed.error, locale);
  }
  const maxSeats = ctx.event.openRsvpMaxSeats;
  if (parsed.data.status === "attending" && parsed.data.seats > maxSeats) {
    const tv = await getTranslations({ locale: toIntlLocale(locale), namespace: "Validation" });
    return { status: "error", fieldErrors: { seats: [tv(VALIDATION_KEYS.seatsExceeded)] } };
  }

  let personalToken: string;
  try {
    await enforceRateLimit({ scope: "rsvp-open-ip", subject: await requestIp(), limit: 10, windowSeconds: 3600 });
    await enforceRateLimit({ scope: "rsvp-open-event", subject: ctx.event.id, limit: 300, windowSeconds: 3600 });

    personalToken = await db.transaction(async (tx) => {
      const current = await lockEvent(tx, ctx.event.id);
      if (!current || !rsvpOpen(current.event) || current.event.rsvpMode !== "open") throw new RsvpClosedError();
      // A phone number is contact data, not proof of ownership of a private link.
      const [existing] = await tx
        .select()
        .from(guests)
        .where(and(eq(guests.eventId, ctx.event.id), eq(guests.phone, parsed.data.phone)))
        .limit(1);

      if (existing) throw new ExistingGuestError();
      if ((await guestCapacityLeft(tx, current.event.id, current.pkg.maxGuests)) < 1) {
        throw new GuestLimitError();
      }
      const [inserted] = await tx
        .insert(guests)
        .values({
          eventId: ctx.event.id,
          name: parsed.data.name,
          phone: parsed.data.phone,
          token: makeGuestToken(),
          source: "self",
          maxSeats: current.event.openRsvpMaxSeats,
        })
        .returning();
      const guest = inserted!;

      const seatCap = Math.min(parsed.data.seats, guest.maxSeats);
      await recordResponse(tx, current, guest.id, {
        status: parsed.data.status,
        seats: seatCap,
        message: parsed.data.message ?? null,
      });
      return guest.token;
    });
  } catch (error) {
    if (error instanceof RsvpClosedError) return { status: "error", formError: t("closed") };
    if (error instanceof ExistingGuestError) return { status: "error", formError: t("usePersonalLink") };
    if (error instanceof GuestLimitError) return { status: "error", formError: t("full") };
    if (error instanceof RateLimitedError) return domainError(error, locale);
    throw error;
  }

  log.info("rsvp.open", "self-registered", { eventId: ctx.event.id, status: parsed.data.status });
  revalidateAfterRsvp(ctx, personalToken);
  redirect(`/i/${personalToken}?rsvp=1`);
}

class GuestLimitError extends Error {
  constructor() {
    super("guest limit reached");
    this.name = "GuestLimitError";
  }
}

class ExistingGuestError extends Error {}
class RsvpClosedError extends Error {}
