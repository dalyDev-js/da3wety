import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { InvitationStage } from "@/components/invitation/invitation-stage";
import { Ticket } from "@/components/invitation/ticket";
import { db } from "@/db";
import { events, guests, qrTokens, rsvps } from "@/db/schema";
import { toIntlLocale } from "@/lib/i18n/config";
import { QR_TOKEN_RE } from "@/lib/tokens";

export const metadata: Metadata = { title: "Da3wety", robots: { index: false } };

/** What a guest (or anyone with the QR) sees: their own pass. Never a check-in action. */
export default async function TicketPage({ params }: PageProps<"/q/[qrToken]">) {
  const { qrToken } = await params;
  if (!QR_TOKEN_RE.test(qrToken)) notFound();
  const [row] = await db
    .select({ ticket: qrTokens, guest: guests, rsvp: rsvps, event: events })
    .from(qrTokens)
    .innerJoin(guests, eq(guests.id, qrTokens.guestId))
    .innerJoin(events, eq(events.id, qrTokens.eventId))
    .leftJoin(rsvps, eq(rsvps.guestId, guests.id))
    .where(and(eq(qrTokens.token, qrToken), eq(qrTokens.status, "active")))
    .limit(1);
  if (!row || row.event.status !== "published") notFound();

  const t = await getTranslations({ locale: toIntlLocale(row.event.locale), namespace: "Ticket" });
  return (
    <InvitationStage theme={row.event.theme}>
      <div className="mx-auto w-full max-w-md px-6 py-10">
        <p className="mb-6 text-center font-heading text-2xl">{row.event.title}</p>
        <Ticket locale={row.event.locale} guestName={row.guest.name} seats={row.rsvp?.seats ?? 1} ticket={row.ticket} />
        <p className="mt-6 text-center text-sm text-(--inv-muted)">{t("staffHint")}</p>
      </div>
    </InvitationStage>
  );
}
