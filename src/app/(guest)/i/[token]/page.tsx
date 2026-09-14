import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { InvitationCard } from "@/components/invitation/invitation-card";
import { InvitationStage } from "@/components/invitation/invitation-stage";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { getEventByGuestToken } from "@/db/queries/events";
import { getRsvpForGuest } from "@/db/queries/guests";
import { toIntlLocale } from "@/lib/i18n/config";
import { rsvpDeadlinePassed } from "@/lib/invitation-access";
import { GUEST_TOKEN_RE } from "@/lib/tokens";

export async function generateMetadata({ params }: PageProps<"/i/[token]">): Promise<Metadata> {
  const { token } = await params;
  const ctx = GUEST_TOKEN_RE.test(token) ? await getEventByGuestToken(token) : null;
  return { title: ctx?.event.title ?? "Da3wety", robots: { index: false } };
}

export default async function PersonalInvitationPage({ params }: PageProps<"/i/[token]">) {
  const { token } = await params;
  const ctx = GUEST_TOKEN_RE.test(token) ? await getEventByGuestToken(token) : null;
  if (!ctx || ctx.event.status !== "published") notFound();

  const { event, guest } = ctx;
  const rsvp = await getRsvpForGuest(guest.id);
  const t = await getTranslations({ locale: toIntlLocale(event.locale), namespace: "Rsvp" });
  const deadlinePassed = rsvpDeadlinePassed(event);

  return (
    <InvitationStage>
      <InvitationCard event={event} guestName={guest.name}>
        {deadlinePassed ? (
          <p className="text-center text-(--inv-muted)">{rsvp ? t("closedWithAnswer") : t("closed")}</p>
        ) : (
          <RsvpForm
            mode="personal"
            token={token}
            maxSeats={guest.maxSeats}
            current={rsvp ? { status: rsvp.status, seats: rsvp.seats, message: rsvp.message } : null}
          />
        )}
      </InvitationCard>
    </InvitationStage>
  );
}
