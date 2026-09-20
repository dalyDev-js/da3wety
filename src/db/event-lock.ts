import "server-only";

import { count, eq } from "drizzle-orm";

import type { Transaction } from "@/db";
import { events, guests, packages } from "@/db/schema";

/** All capacity-sensitive writers lock the same event before reading its limits. */
export async function lockEvent(tx: Transaction, eventId: string) {
  const [event] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
  if (!event) return null;
  const [pkg] = await tx.select().from(packages).where(eq(packages.tier, event.packageTier));
  return pkg ? { event, pkg } : null;
}

export async function guestCapacityLeft(tx: Transaction, eventId: string, maxGuests: number | null) {
  if (maxGuests === null) return Number.POSITIVE_INFINITY;
  const [row] = await tx.select({ value: count() }).from(guests).where(eq(guests.eventId, eventId));
  return Math.max(0, maxGuests - row.value);
}
