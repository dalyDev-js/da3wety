"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { getPackage } from "@/db/queries/packages";
import { events, guests, PACKAGE_TIERS, packageAssignments, qrTokens, rsvps } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { computeGalleryExpiresAt } from "@/lib/dates";
import { log } from "@/lib/log";
import { ensureActiveTicket } from "@/lib/tickets";
import type { ActionState } from "@/lib/validation/form";
import { z } from "@/lib/validation/zod-config";

const input = z.object({
  eventId: z.uuid(),
  tier: z.enum(PACKAGE_TIERS),
  amountEgp: z.coerce.number().int().min(0).max(1_000_000).optional(),
  note: z.string().trim().max(300).optional(),
});

/**
 * Manual sale: sets the tier, records the audit row, re-derives retention and
 * feature flags, and backfills tickets for guests who already said yes.
 */
export async function assignPackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = input.safeParse({
    eventId: formData.get("eventId"),
    tier: formData.get("tier"),
    amountEgp: formData.get("amountEgp") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { status: "error", formError: "invalid" };
  const { eventId, tier, amountEgp, note } = parsed.data;

  const pkg = await getPackage(tier);

  const assigned = await db.transaction(async (tx) => {
    const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!event) return false;
    await tx
      .update(events)
      .set({
        packageTier: tier,
        galleryEnabled: pkg.galleryEnabled ? event.galleryEnabled : false,
        galleryModeration: pkg.moderationEnabled ? event.galleryModeration : false,
        checkinEnabled: pkg.checkinEnabled ? event.checkinEnabled : false,
        galleryExpiresAt: computeGalleryExpiresAt({
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          retentionDays: pkg.photoRetentionDays,
        }),
      })
      .where(eq(events.id, eventId));

    await tx
      .insert(packageAssignments)
      .values({ eventId, tier, assignedBy: admin.id, amountEgp: amountEgp ?? null, note: note ?? null });

    if (pkg.checkinEnabled) {
      // Guests who confirmed before the upgrade get their passes now.
      const attending = await tx
        .select({ guestId: rsvps.guestId })
        .from(rsvps)
        .innerJoin(guests, eq(guests.id, rsvps.guestId))
        .leftJoin(qrTokens, and(eq(qrTokens.guestId, rsvps.guestId), eq(qrTokens.status, "active")))
        .where(and(eq(rsvps.eventId, eventId), eq(rsvps.status, "attending"), isNull(qrTokens.id)));
      for (const row of attending) await ensureActiveTicket(tx, eventId, row.guestId);
    }
    return true;
  });
  if (!assigned) return { status: "error", formError: "not found" };

  log.info("admin.assignPackage", "package assigned", { eventId, tier, adminId: admin.id, amountEgp });
  revalidatePath("/admin");
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { status: "success" };
}
