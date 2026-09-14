import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AddGuestsDialogs } from "@/components/dashboard/add-guests-dialogs";
import { GuestActions } from "@/components/dashboard/guest-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEventForHost } from "@/db/queries/events";
import { listGuests, type GuestFilter } from "@/db/queries/guests";
import { requireHost } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { toIntlLocale } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Event");
  return { title: t("tabs.guests"), robots: { index: false } };
}

const FILTERS: GuestFilter[] = ["all", "attending", "declined", "pending"];

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function GuestsPage({ params, searchParams }: PageProps<"/dashboard/events/[eventId]/guests">) {
  const host = await requireHost();
  const { eventId } = await params;
  const sp = await searchParams;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) notFound();

  const q = one(sp.q) ?? "";
  const filterRaw = one(sp.filter);
  const filter: GuestFilter = FILTERS.includes(filterRaw as GuestFilter) ? (filterRaw as GuestFilter) : "all";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [t, tRsvp, tInvite, common, list] = await Promise.all([
    getTranslations("Guests"),
    getTranslations("Rsvp"),
    getTranslations({ locale: toIntlLocale(ctx.event.locale), namespace: "Invitation" }),
    getTranslations("Common"),
    listGuests({ eventId, q, filter, page }),
  ]);

  const siteUrl = publicEnv().NEXT_PUBLIC_SITE_URL;
  const shareText = tInvite("shareText", { title: ctx.event.title });
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const query = (overrides: Record<string, string | number>) => {
    const p = new URLSearchParams({
      q,
      filter,
      page: String(page),
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    });
    return `?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("count", { count: list.total })}
          {ctx.pkg.maxGuests !== null ? ` · ${t("limit", { max: ctx.pkg.maxGuests })}` : null}
        </p>
        <AddGuestsDialogs eventId={eventId} />
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute inset-y-0 start-2.5 my-auto size-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={t("searchPlaceholder")} className="ps-8" />
        </div>
        <NativeSelect name="filter" defaultValue={filter} className="w-40">
          {FILTERS.map((f) => (
            <NativeSelectOption key={f} value={f}>
              {t(`filters.${f}`)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary">
          {t("apply")}
        </Button>
      </form>

      {list.rows.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{q || filter !== "all" ? t("noMatches") : t("empty")}</EmptyTitle>
            <EmptyDescription>{q || filter !== "all" ? t("noMatchesHint") : t("emptyHint")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("phone")}</TableHead>
                <TableHead>{t("seatsShort")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="text-end">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.rows.map(({ guest, rsvp }) => (
                <TableRow key={guest.id}>
                  <TableCell>
                    <div className="font-medium">{guest.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {guest.groupLabel ? guest.groupLabel : null}
                      {guest.source === "self" ? ` ${t("selfRegistered")}` : null}
                    </div>
                  </TableCell>
                  <TableCell dir="ltr" className="text-start tabular-nums">
                    {guest.phone ?? "—"}
                  </TableCell>
                  <TableCell dir="ltr" className="text-start tabular-nums">
                    {rsvp?.status === "attending" ? `${rsvp.seats} / ${guest.maxSeats}` : guest.maxSeats}
                  </TableCell>
                  <TableCell>
                    {rsvp ? (
                      <Badge variant={rsvp.status === "attending" ? "default" : "secondary"}>
                        {rsvp.status === "attending" ? tRsvp("attending") : tRsvp("declined")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("filters.pending")}</Badge>
                    )}
                    {rsvp?.message ? (
                      <p className="mt-1 line-clamp-1 max-w-56 text-xs text-muted-foreground">{rsvp.message}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end">
                      <GuestActions
                        eventId={eventId}
                        guest={guest}
                        personalLink={`${siteUrl}/i/${guest.token}`}
                        shareText={shareText}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <Button asChild variant="outline" size="sm" disabled={page <= 1}>
            <Link href={query({ page: page - 1 })} aria-disabled={page <= 1}>
              {common("back")}
            </Link>
          </Button>
          <span dir="ltr">
            {page} / {pages}
          </span>
          <Button asChild variant="outline" size="sm" disabled={page >= pages}>
            <Link href={query({ page: page + 1 })} aria-disabled={page >= pages}>
              {t("next")}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
