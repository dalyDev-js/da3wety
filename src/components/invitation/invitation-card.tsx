import { ImagesIcon, MapPinIcon } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { captionClass } from "@/components/invitation/caption";
import { GiftSection } from "@/components/invitation/gift-section";
import { GoldRule } from "@/components/invitation/gold-rule";
import { InvitationHero } from "@/components/invitation/invitation-hero";
import { getTheme } from "@/components/invitation/invitation-theme";
import type { Event } from "@/db/schema";
import { formats, toIntlLocale } from "@/lib/i18n/config";
import { publicAssetUrl } from "@/lib/storage";

type Props = {
  event: Event;
  /** Personal greeting for /i/<token> pages. */
  guestName?: string | null;
  /** Link to the shared gallery when it is open for this event. */
  galleryHref?: string | null;
  /** RSVP form, ticket, gallery links: rendered below the card body. */
  children?: ReactNode;
};

/**
 * The invitation itself, server-rendered in the event's locale. The first
 * screen (hero) holds the photo and the names; everything else follows below.
 * All text is in the HTML regardless of the animations.
 */
export async function InvitationCard({ event, guestName, galleryHref, children }: Props) {
  const locale = toIntlLocale(event.locale);
  const theme = getTheme(event.theme);
  const [t, format] = await Promise.all([
    getTranslations({ locale, namespace: "Invitation" }),
    getFormatter({ locale }),
  ]);

  const dateLine = format.dateTime(event.startsAt, { ...formats.dateTime.eventDate, timeZone: event.timezone });
  const timeLine = format.dateTime(event.startsAt, { ...formats.dateTime.eventTime, timeZone: event.timezone });
  const endLine = event.endsAt
    ? format.dateTime(event.endsAt, { ...formats.dateTime.eventTime, timeZone: event.timezone })
    : null;
  const revealSrc = event.revealImagePath ? publicAssetUrl(event.revealImagePath) : null;

  return (
    <article className="flex w-full flex-col items-center text-center text-(--inv-ink)">
      <InvitationHero
        photoSrc={revealSrc}
        photoAlt={t("photoAlt")}
        foil={theme.foil}
        confetti={theme.confetti}
        intro={
          <>
            {guestName ? <p className="text-sm text-(--inv-muted)">{t("greeting", { name: guestName })}</p> : null}
            {event.familyNames ? <p className="font-heading text-lg leading-relaxed">{event.familyNames}</p> : null}
            <p className={`text-(--inv-accent)/90 ${captionClass(locale)}`}>{t(`inviteLine.${event.eventType}`)}</p>
          </>
        }
        names={
          <h1 className="font-heading text-4xl leading-tight font-bold text-balance sm:text-5xl">
            {event.honoreePrimary}
            {event.honoreeSecondary ? (
              <>
                <span className="mx-3 block text-2xl font-normal text-(--inv-gold) sm:inline">{t("and")}</span>
                {event.honoreeSecondary}
              </>
            ) : null}
          </h1>
        }
        date={<p className={`text-(--inv-accent)/90 ${captionClass(locale, "text-[13px]")}`}>{dateLine}</p>}
      />

      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-6 pt-4 pb-10">
        <GoldRule className="w-full" />

        {event.description ? (
          <p className="max-w-prose leading-loose whitespace-pre-line">{event.description}</p>
        ) : null}

        <div className="space-y-1">
          <p className="font-heading text-2xl">{dateLine}</p>
          <p className="text-(--inv-muted)" dir="auto">
            {endLine ? t("timeRange", { start: timeLine, end: endLine }) : t("timeAt", { time: timeLine })}
          </p>
        </div>

        {event.venueName || event.venueAddress ? (
          <address className="space-y-1 not-italic">
            {event.venueName ? <p className="text-lg font-semibold">{event.venueName}</p> : null}
            {event.venueAddress ? <p className="text-(--inv-muted)">{event.venueAddress}</p> : null}
            {event.venueMapsUrl ? (
              <a
                href={event.venueMapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-(--inv-gold) px-4 py-1.5 text-sm text-(--inv-accent) hover:bg-(--inv-gold-soft)/40 focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:outline-none"
              >
                <MapPinIcon className="size-4" />
                {t("openMaps")}
              </a>
            ) : null}
          </address>
        ) : null}

        <GiftSection event={event} locale={locale} />

        <GoldRule className="w-full" />

        {children ? <div className="w-full">{children}</div> : null}

        {galleryHref ? (
          <Link
            href={galleryHref}
            className="mt-2 inline-flex items-center gap-2 rounded-full border border-(--inv-gold) px-5 py-2.5 text-(--inv-accent) hover:bg-(--inv-gold-soft)/40"
          >
            <ImagesIcon className="size-5" />
            <span>
              {t("galleryLink")}
              <span className="block text-xs text-(--inv-muted)">{t("galleryLinkHint")}</span>
            </span>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
