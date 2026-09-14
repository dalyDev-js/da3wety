import "server-only";

import { and, eq } from "drizzle-orm";

import type { Transaction } from "@/db";
import { db } from "@/db";
import { qrTokens, type QrToken } from "@/db/schema";
import { qrToken as makeQrToken, shortCode as makeShortCode } from "@/lib/tokens";

type Executor = Transaction | typeof db;

/**
 * Returns the guest's active ticket, issuing one if needed. Safe under concurrent
 * RSVP submits: the partial unique index on (guest_id) where active makes the second
 * insert a no-op, after which we re-select. Short-code collisions retry.
 */
export async function ensureActiveTicket(exec: Executor, eventId: string, guestId: string): Promise<QrToken> {
  const existing = await getActiveTicket(exec, guestId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt++) {
    const [inserted] = await exec
      .insert(qrTokens)
      .values({ eventId, guestId, token: makeQrToken(), shortCode: makeShortCode(), status: "active" })
      .onConflictDoNothing()
      .returning();
    if (inserted) return inserted;
    // Either another request issued the ticket (guest_active index) or the short code
    // collided within the event (event_short_code index); re-check before retrying.
    const again = await getActiveTicket(exec, guestId);
    if (again) return again;
  }
  throw new Error(`Could not issue a ticket for guest ${guestId}`);
}

export async function getActiveTicket(exec: Executor, guestId: string): Promise<QrToken | null> {
  const [row] = await exec
    .select()
    .from(qrTokens)
    .where(and(eq(qrTokens.guestId, guestId), eq(qrTokens.status, "active")))
    .limit(1);
  return row ?? null;
}

export async function revokeActiveTicket(exec: Executor, guestId: string): Promise<void> {
  await exec
    .update(qrTokens)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(qrTokens.guestId, guestId), eq(qrTokens.status, "active")));
}
