import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EnvelopeReveal } from "@/components/invitation/envelope-reveal";
import { InvitationCard } from "@/components/invitation/invitation-card";
import { InvitationStage } from "@/components/invitation/invitation-stage";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { toIntlLocale } from "@/lib/i18n/config";
import { publicAssetUrl } from "@/lib/storage";
import { getVisibleEventBySlug, rsvpDeadlinePassed } from "@/lib/invitation-access";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  if (!ctx) return { title: "Da3wety", robots: { index: false } };
  const { event } = ctx;
  const t = await getTranslations({ locale: toIntlLocale(event.locale), namespace: "Invitation" });
  const description = t("metaDescription", {
    primary: event.honoreePrimary,
    secondary: event.honoreeSecondary ?? "",
  }).trim();
  const version = event.updatedAt.getTime();

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      locale: event.locale === "ar" ? "ar_EG" : "en_GB",
      images: [{ url: `/e/${slug}/opengraph-image?v=${version}`, width: 1200, height: 630, alt: event.title }],
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
    <InvitationStage>
      <EnvelopeReveal
        seenKey={`e:${slug}`}
        revealImageUrl={event.revealImagePath ? publicAssetUrl(event.revealImagePath) : null}
      >
        <InvitationCard event={event}>
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
      </EnvelopeReveal>
    </InvitationStage>
  );
}
