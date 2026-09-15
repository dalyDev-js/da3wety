import { desc, eq } from "drizzle-orm";
import { LockIcon, RefreshCwIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { enableCheckin, rotateScannerToken } from "@/actions/checkin";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { getEventForHost } from "@/db/queries/events";
import { getCheckinStats, getRsvpStats } from "@/db/queries/stats";
import { checkins, guests } from "@/db/schema";
import { requireHost } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { packageAllows } from "@/lib/packages";
import { renderQrSvg } from "@/lib/qr";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Event");
  return { title: t("tabs.checkin"), robots: { index: false } };
}

export default async function CheckinPage({ params }: PageProps<"/dashboard/events/[eventId]/checkin">) {
  const host = await requireHost();
  const { eventId } = await params;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) notFound();
  const { event, pkg } = ctx;
  const [t, common, format] = await Promise.all([
    getTranslations("Checkin"),
    getTranslations("Common"),
    getFormatter(),
  ]);

  if (!packageAllows(pkg, "checkin")) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <LockIcon className="mx-auto size-6 text-muted-foreground" />
          <EmptyTitle>{t("locked.title")}</EmptyTitle>
          <EmptyDescription>{t("locked.body")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!event.checkinEnabled || !event.scannerToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("enable.title")}</CardTitle>
          <CardDescription>{t("enable.body")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={enableCheckin.bind(null, eventId)}>
            <Button type="submit">{t("enable.button")}</Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  const [rsvp, door, recent] = await Promise.all([
    getRsvpStats(eventId),
    getCheckinStats(eventId),
    db
      .select({
        at: checkins.createdAt,
        seats: checkins.seatsAdmitted,
        by: checkins.scannedBy,
        method: checkins.method,
        name: guests.name,
      })
      .from(checkins)
      .innerJoin(guests, eq(guests.id, checkins.guestId))
      .where(eq(checkins.eventId, eventId))
      .orderBy(desc(checkins.createdAt))
      .limit(20),
  ]);
  const scannerUrl = `${publicEnv().NEXT_PUBLIC_SITE_URL}/scan/${event.scannerToken}`;
  const svg = await renderQrSvg(scannerUrl);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={5000} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t("stats.partiesIn"), `${door.partiesCheckedIn} / ${rsvp.attending}`],
          [t("stats.seatsIn"), `${door.seatsAdmitted} / ${rsvp.expectedSeats}`],
          [t("stats.pendingParties"), String(Math.max(0, rsvp.attending - door.partiesCheckedIn))],
          [t("stats.lastScan"), recent[0] ? format.relativeTime(recent[0].at) : "—"],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums" dir="ltr">
                {value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("link.title")}</CardTitle>
          <CardDescription>{t("link.body")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
          <div className="w-40 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="space-y-3">
            <code dir="ltr" className="block truncate rounded-md bg-muted px-3 py-2 text-sm">
              {scannerUrl}
            </code>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={scannerUrl} label={common("copy")} copiedLabel={common("copied")} />
              <form action={rotateScannerToken.bind(null, eventId)}>
                <Button type="submit" variant="outline" size="sm">
                  <RefreshCwIcon />
                  {t("link.rotate")}
                </Button>
              </form>
              <Button asChild variant="outline" size="sm">
                <a href={`/dashboard/events/${eventId}/checkin/export`}>{t("export")}</a>
              </Button>
            </div>
            {event.scannerTokenExpiresAt ? (
              <p className="text-xs text-muted-foreground">
                {t("link.expires", {
                  date: format.dateTime(event.scannerTokenExpiresAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.timezone,
                  }),
                })}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("recent.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("recent.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recent.guest")}</TableHead>
                  <TableHead>{t("recent.seats")}</TableHead>
                  <TableHead>{t("recent.by")}</TableHead>
                  <TableHead>{t("recent.time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell dir="ltr">{r.seats}</TableCell>
                    <TableCell>{r.by ?? t(`method.${r.method}`)}</TableCell>
                    <TableCell>{format.dateTime(r.at, { timeStyle: "short", timeZone: event.timezone })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
