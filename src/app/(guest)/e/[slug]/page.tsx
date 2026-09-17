import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EnvelopeGate } from "@/components/invitation/envelope-gate";
import { InvitationCard } from "@/components/invitation/invitation-card";
import { InvitationStage } from "@/components/invitation/invitation-stage";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { toIntlLocale } from "@/lib/i18n/config";
import { monogram } from "@/lib/monogram";
import { galleryState } from "@/lib/gallery-access";
import { getVisibleEventBySlug, rsvpDeadlinePassed } from "@/lib/invitation-access";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  if (!ctx) return { title: "Da3wety", robots: { index: false } };
  const { event } = ctx;
  const t = await getTranslations({ locale: toIntlLocale(event.locale), namespace: "Invitation" });
  const names = event.honoreeSecondary
    ? t("honorees", { primary: event.honoreePrimary, secondary: event.honoreeSecondary })
    : event.honoreePrimary;
  const description = t("metaDescription", { names });

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      locale: event.locale === "ar" ? "ar_EG" : "en_GB",
    },
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

export default async function PublicInvitationPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  if (!ctx) notFound();

  const { event } = ctx;
  const t = await getTranslations({ locale: toIntlLocale(event.locale), namespace: "Rsvp" });
  const deadlinePassed = rsvpDeadlinePassed(event);

  return (
    <InvitationStage theme={event.theme}>
      <EnvelopeGate monogram={monogram(event.honoreePrimary, event.honoreeSecondary)}>
        <InvitationCard event={event} galleryHref={galleryState(ctx) === "open" ? `/e/${slug}/gallery` : null}>
          {event.rsvpMode === "open" ? (
            deadlinePassed ? (
              <p className="text-center text-(--inv-muted)">{t("closed")}</p>
            ) : (
              <RsvpForm mode="open" slug={slug} maxSeats={event.openRsvpMaxSeats} />
            )
          ) : (
            <p className="text-center text-(--inv-muted)">{t("inviteOnly")}</p>
          )}
        </InvitationCard>
      </EnvelopeGate>
    </InvitationStage>
  );
}
