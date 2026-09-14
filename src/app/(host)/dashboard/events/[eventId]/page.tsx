import { ExternalLinkIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { setEventStatus } from "@/actions/events";
import { CopyButton } from "@/components/dashboard/copy-button";
import { DeleteEventButton } from "@/components/dashboard/delete-event-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEventForHost } from "@/db/queries/events";
import { getRsvpStats } from "@/db/queries/stats";
import { requireHost } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

export async function generateMetadata({ params }: PageProps<"/dashboard/events/[eventId]">): Promise<Metadata> {
  const host = await requireHost();
  const { eventId } = await params;
  const ctx = await getEventForHost(eventId, host.id);
  return { title: ctx?.event.title ?? "…", robots: { index: false } };
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl tabular-nums" dir="ltr">
          {value}
        </CardTitle>
      </CardHeader>
      {hint ? <CardContent className="text-xs text-muted-foreground">{hint}</CardContent> : null}
    </Card>
  );
}

export default async function EventOverviewPage({ params }: PageProps<"/dashboard/events/[eventId]">) {
  const host = await requireHost();
  const { eventId } = await params;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) notFound();
  const { event } = ctx;

  const [t, common, format, stats] = await Promise.all([
    getTranslations("Event"),
    getTranslations("Common"),
    getFormatter(),
    getRsvpStats(eventId),
  ]);

  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  const publicLink = `${siteUrl}/e/${event.slug}`;
  const isPublished = event.status === "published";
  const toggleStatus = setEventStatus.bind(null, eventId, isPublished ? "draft" : "published");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("stats.guests")}
          value={stats.guests}
          hint={t("stats.invitedSeats", { count: stats.invitedSeats })}
        />
        <Stat
          label={t("stats.attending")}
          value={stats.attending}
          hint={t("stats.expectedSeats", { count: stats.expectedSeats })}
        />
        <Stat label={t("stats.declined")} value={stats.declined} />
        <Stat label={t("stats.pending")} value={stats.pending} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("share.title")}</CardTitle>
          <CardDescription>{isPublished ? t("share.publishedHint") : t("share.draftHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code dir="ltr" className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">
              {publicLink}
            </code>
            <CopyButton value={publicLink} label={common("copy")} copiedLabel={common("copied")} />
            <Button asChild variant="outline" size="sm">
              <Link href={`/e/${event.slug}`} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                {t("share.preview")}
              </Link>
            </Button>
          </div>
          <dl className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">{t("startsAt")}: </dt>
              <dd className="inline">
                {format.dateTime(event.startsAt, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: event.timezone,
                })}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">{t("rsvpMode")}: </dt>
              <dd className="inline">{t(`rsvpModes.${event.rsvpMode}`)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <form action={toggleStatus}>
              <Button type="submit" variant={isPublished ? "outline" : "default"} size="sm">
                {isPublished ? <EyeOffIcon /> : <EyeIcon />}
                {isPublished ? t("unpublish") : t("publish")}
              </Button>
            </form>
            <DeleteEventButton
              eventId={eventId}
              labels={{
                button: t("delete.button"),
                title: t("delete.title"),
                description: t("delete.description"),
                confirm: t("delete.confirm"),
                cancel: common("cancel"),
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
