import { CalendarPlusIcon, ChevronLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { listEventsForHost } from "@/db/queries/events";
import { requireHost } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("myEvents"), robots: { index: false } };
}

export default async function DashboardPage() {
  const profile = await requireHost();
  const [t, tEvent, format, rows] = await Promise.all([
    getTranslations("Dashboard"),
    getTranslations("Event"),
    getFormatter(),
    listEventsForHost(profile.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("myEvents")}</h1>
          <p className="text-sm text-muted-foreground">{t("welcome", { name: profile.fullName ?? profile.email })}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/events/new">
            <CalendarPlusIcon />
            {t("newEvent")}
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarPlusIcon />
            </EmptyMedia>
            <EmptyTitle>{t("noEvents")}</EmptyTitle>
            <EmptyDescription>{t("noEventsHint")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/dashboard/events/new">{t("newEvent")}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ItemGroup className="gap-2">
          {rows.map(({ event, guestCount, attendingCount }) => (
            <Item key={event.id} asChild variant="outline">
              <Link href={`/dashboard/events/${event.id}`}>
                <ItemContent>
                  <ItemTitle className="flex items-center gap-2">
                    {event.title}
                    <Badge variant={event.status === "published" ? "default" : "secondary"}>
                      {tEvent(`statuses.${event.status}`)}
                    </Badge>
                    <Badge variant="outline">{tEvent(`tiers.${event.packageTier}`)}</Badge>
                  </ItemTitle>
                  <ItemDescription>
                    {format.dateTime(event.startsAt, {
                      ...{ dateStyle: undefined },
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: event.timezone,
                    })}
                    {" · "}
                    {tEvent("stats.attendingOfGuests", { attending: attendingCount, guests: guestCount })}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ChevronLeftIcon className="size-4 text-muted-foreground ltr:rotate-180 rtl:rotate-0" />
                </ItemActions>
              </Link>
            </Item>
          ))}
        </ItemGroup>
      )}
    </div>
  );
}
