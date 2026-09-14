import { AlertTriangleIcon, LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";

import { ModerationGrid, type HostPhoto } from "@/components/gallery/moderation-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getEventForHost } from "@/db/queries/events";
import { countPhotosForEvent, listPhotosForHost } from "@/db/queries/photos";
import type { PhotoStatus } from "@/db/schema/enums";
import { requireHost } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { galleryState } from "@/lib/gallery-access";
import { packageAllows } from "@/lib/packages";
import { BUCKETS, createSignedReadUrls } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Event");
  return { title: t("tabs.gallery"), robots: { index: false } };
}

const STATUSES = ["all", "pending", "approved", "rejected"] as const;

export default async function HostGalleryPage({
  params,
  searchParams,
}: PageProps<"/dashboard/events/[eventId]/gallery">) {
  const host = await requireHost();
  const { eventId } = await params;
  const sp = await searchParams;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) notFound();
  const { event, pkg } = ctx;
  const [t, format] = await Promise.all([getTranslations("Gallery"), getFormatter()]);

  if (!packageAllows(pkg, "gallery")) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <LockIcon className="mx-auto size-6 text-muted-foreground" />
          <EmptyTitle>{t("locked.title")}</EmptyTitle>
          <EmptyDescription>{t("locked.body")}</EmptyDescription>
        </EmptyHeader>
        {publicEnv().NEXT_PUBLIC_SUPPORT_WHATSAPP ? (
          <Button asChild>
            <a
              href={`https://wa.me/${publicEnv().NEXT_PUBLIC_SUPPORT_WHATSAPP!.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("locked.cta")}
            </a>
          </Button>
        ) : null}
      </Empty>
    );
  }

  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = (
    STATUSES.includes(statusRaw as (typeof STATUSES)[number]) ? statusRaw : event.galleryModeration ? "pending" : "all"
  ) as PhotoStatus | "all";
  const [{ rows }, counts] = await Promise.all([listPhotosForHost(eventId, status), countPhotosForEvent(eventId)]);
  const [thumbs, downloads] = await Promise.all([
    createSignedReadUrls(
      BUCKETS.photos,
      rows.map((p) => p.thumbPath),
    ),
    createSignedReadUrls(
      BUCKETS.photos,
      rows.map((p) => p.storagePath),
      { download: true },
    ),
  ]);
  const photos: HostPhoto[] = rows.map((p) => ({
    id: p.id,
    thumbUrl: thumbs.get(p.thumbPath) ?? "",
    downloadUrl: downloads.get(p.storagePath) ?? "",
    uploaderName: p.uploaderName,
    status: p.status,
  }));
  const state = galleryState(ctx);

  return (
    <div className="space-y-4">
      {event.galleryExpiresAt && !event.galleryPurgedAt ? (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>{t("retention.title")}</AlertTitle>
          <AlertDescription>
            {t("retention.body", {
              date: format.dateTime(event.galleryExpiresAt, { dateStyle: "long", timeZone: event.timezone }),
            })}
          </AlertDescription>
        </Alert>
      ) : null}
      {event.galleryPurgedAt ? (
        <Alert>
          <AlertTitle>{t("purged.title")}</AlertTitle>
          <AlertDescription>
            {t("purged.body", { date: format.dateTime(event.galleryPurgedAt, { dateStyle: "long" }) })}
          </AlertDescription>
        </Alert>
      ) : null}
      {!event.galleryEnabled ? (
        <p className="text-sm text-muted-foreground">
          {t("notEnabled")}{" "}
          <Link href={`/dashboard/events/${eventId}/edit`} className="underline">
            {t("enableInSettings")}
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          {t("counts", { stored: counts.stored, pending: counts.pending, max: pkg.maxPhotos })}
        </span>
        <nav className="ms-auto flex gap-1">
          {STATUSES.map((s) => (
            <Button key={s} asChild size="sm" variant={s === status ? "default" : "ghost"}>
              <Link href={`?status=${s}`}>{t(`filters.${s}`)}</Link>
            </Button>
          ))}
        </nav>
      </div>

      {photos.length ? (
        <ModerationGrid eventId={eventId} photos={photos} moderation={event.galleryModeration} />
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{t("hostEmpty")}</EmptyTitle>
            <EmptyDescription>
              {state === "open" ? t("hostEmptyHint", { url: `/e/${event.slug}/gallery` }) : t(`state.${state}`)}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
