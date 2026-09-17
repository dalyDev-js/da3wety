import { CalendarPlusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { Event } from "@/db/schema";
import { googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { publicEnv } from "@/lib/env";
import type { IntlLocale } from "@/lib/i18n/config";

type Props = { event: Event; locale: IntlLocale };

/** Google and Outlook open in a new tab; Apple downloads the .ics route. */
export async function AddToCalendar({ event, locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Calendar" });
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const cal: CalendarEvent = {
    uid: `${event.id}@da3wety.com`,
    title: event.title,
    description: event.description,
    location: [event.venueName, event.venueAddress].filter(Boolean).join(", ") || null,
    start: event.startsAt,
    end: event.endsAt,
    url: `${site}/e/${event.slug}`,
  };
  const linkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-(--inv-gold) px-3 py-1.5 text-xs text-(--inv-accent) hover:bg-(--inv-gold-soft)/40 focus-visible:ring-2 focus-visible:ring-(--inv-gold) focus-visible:outline-none";
  return (
    <div className="space-y-2">
      <p className="inline-flex items-center gap-1.5 text-sm text-(--inv-muted)">
        <CalendarPlusIcon className="size-4" />
        {t("add")}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <a className={linkClass} href={googleCalendarUrl(cal)} target="_blank" rel="noreferrer noopener">
          {t("google")}
        </a>
        <a className={linkClass} href={`/e/${event.slug}/event.ics`}>
          {t("apple")}
        </a>
        <a className={linkClass} href={outlookCalendarUrl(cal)} target="_blank" rel="noreferrer noopener">
          {t("outlook")}
        </a>
      </div>
    </div>
  );
}
