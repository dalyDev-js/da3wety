import { desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { AssignPackageForm } from "@/components/dashboard/assign-package-form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/db";
import { events, guests, profiles, rsvps } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin");
  return { title: t("title"), robots: { index: false } };
}

/** Operator view: every event with its host and tier; manual package assignment. */
export default async function AdminPage() {
  await requireAdmin();
  const [t, tEvent, format, rows] = await Promise.all([
    getTranslations("Admin"),
    getTranslations("Event"),
    getFormatter(),
    db
      .select({
        event: events,
        hostEmail: profiles.email,
        hostName: profiles.fullName,
        guestCount: sql<number>`(select count(*) from ${guests} g where g.event_id = ${events.id})`.mapWith(Number),
        attending:
          sql<number>`(select count(*) from ${rsvps} r where r.event_id = ${events.id} and r.status = 'attending')`.mapWith(
            Number,
          ),
      })
      .from(events)
      .innerJoin(profiles, eq(profiles.id, events.hostId))
      .orderBy(desc(events.createdAt))
      .limit(200),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("event")}</TableHead>
              <TableHead>{t("host")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("guests")}</TableHead>
              <TableHead>{t("package")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ event, hostEmail, hostName, guestCount, attending }) => (
              <TableRow key={event.id}>
                <TableCell>
                  <Link
                    href={`/e/${event.slug}`}
                    target="_blank"
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {event.title}
                  </Link>
                  <div className="mt-1 flex gap-1">
                    <Badge variant={event.status === "published" ? "default" : "secondary"}>
                      {tEvent(`statuses.${event.status}`)}
                    </Badge>
                    <Badge variant="outline">{tEvent(`tiers.${event.packageTier}`)}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div>{hostName ?? "—"}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {hostEmail}
                  </div>
                </TableCell>
                <TableCell>
                  {format.dateTime(event.startsAt, { dateStyle: "medium", timeZone: event.timezone })}
                </TableCell>
                <TableCell dir="ltr">
                  {attending} / {guestCount}
                </TableCell>
                <TableCell>
                  <AssignPackageForm eventId={event.id} current={event.packageTier} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
