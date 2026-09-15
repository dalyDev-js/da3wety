import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EnvelopeReveal } from "@/components/invitation/envelope-reveal";
import { InvitationCard } from "@/components/invitation/invitation-card";
import { InvitationStage } from "@/components/invitation/invitation-stage";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { Ticket } from "@/components/invitation/ticket";
import { db } from "@/db";
import { getEventByGuestToken } from "@/db/queries/events";
import { getRsvpForGuest } from "@/db/queries/guests";
import { toIntlLocale } from "@/lib/i18n/config";
import { publicAssetUrl } from "@/lib/storage";
import { rsvpDeadlinePassed } from "@/lib/invitation-access";
import { galleryState } from "@/lib/gallery-access";
import { packageAllows } from "@/lib/packages";
import { getActiveTicket } from "@/lib/tickets";
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
  const ticket =
    rsvp?.status === "attending" && packageAllows(ctx.pkg, "checkin") ? await getActiveTicket(db, guest.id) : null;

  return (
    <InvitationStage>
      <EnvelopeReveal
        seenKey={`i:${token}`}
        revealImageUrl={event.revealImagePath ? publicAssetUrl(event.revealImagePath) : null}
      >
        <InvitationCard
          event={event}
          guestName={guest.name}
          galleryHref={galleryState(ctx) === "open" ? `/i/${token}/gallery` : null}
        >
          {ticket && rsvp ? (
            <Ticket
              locale={event.locale}
              guestName={guest.name}
              seats={rsvp.seats}
              ticket={ticket}
              pngHref={`/i/${token}/ticket.png`}
            />
          ) : null}
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
      </EnvelopeReveal>
    </InvitationStage>
  );
}
