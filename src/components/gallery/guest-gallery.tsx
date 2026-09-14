import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { GoldRule } from "@/components/invitation/gold-rule";
import { InvitationStage } from "@/components/invitation/invitation-stage";
import { PhotoGrid, type GridPhoto } from "@/components/gallery/photo-grid";
import { Uploader } from "@/components/gallery/uploader";
import { listPublicPhotos, listSessionPhotos } from "@/db/queries/photos";
import type { Photo } from "@/db/schema";
import { galleryState, getUploadSession, resolveGalleryRef, type GalleryRef } from "@/lib/gallery-access";
import { formats, toIntlLocale } from "@/lib/i18n/config";
import { BUCKETS, createSignedReadUrls } from "@/lib/storage";

type Props = { galleryRef: GalleryRef; backHref: string };

/** Guest-facing gallery shared by the public and personal links. */
export async function GuestGallery({ galleryRef, backHref }: Props) {
  const ctx = await resolveGalleryRef(galleryRef);
  if (!ctx) return null;
  const { event } = ctx;
  const locale = toIntlLocale(event.locale);
  const [t, format] = await Promise.all([getTranslations({ locale, namespace: "Gallery" }), getFormatter({ locale })]);
  const state = galleryState(ctx);

  let grid: GridPhoto[] = [];
  if (state === "open") {
    const session = await getUploadSession();
    const [{ rows: pub }, own] = await Promise.all([
      listPublicPhotos(event.id),
      session ? listSessionPhotos(event.id, session) : Promise.resolve([] as Photo[]),
    ]);
    const ownIds = new Set(own.map((p) => p.id));
    const merged: Photo[] = [...own.filter((p) => p.status !== "approved"), ...pub];
    const urls = await createSignedReadUrls(
      BUCKETS.photos,
      merged.flatMap((p) => [p.thumbPath, p.storagePath]),
    );
    grid = merged.map((p) => ({
      id: p.id,
      thumbUrl: urls.get(p.thumbPath) ?? "",
      fullUrl: urls.get(p.storagePath) ?? "",
      uploaderName: p.uploaderName,
      pending: p.status === "pending",
      own: ownIds.has(p.id),
    }));
  }

  return (
    <InvitationStage>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
        <header className="space-y-2 text-center">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-(--inv-muted)">
            <ArrowRightIcon className="size-4 ltr:rotate-180" />
            {t("backToInvitation")}
          </Link>
          <h1 className="font-heading text-3xl">{t("title")}</h1>
          <p className="text-(--inv-muted)">{event.title}</p>
          <GoldRule />
        </header>

        {state === "open" ? (
          <>
            <Uploader galleryRef={galleryRef} uploaderName={ctx.guestName} />
            <p className="text-center text-sm text-(--inv-muted)">
              {event.galleryModeration ? t("moderationNote") : null}{" "}
              {event.galleryExpiresAt
                ? t("expiresNote", {
                    date: format.dateTime(event.galleryExpiresAt, {
                      ...formats.dateTime.short,
                      timeZone: event.timezone,
                    }),
                  })
                : null}
            </p>
            {grid.length ? (
              <PhotoGrid photos={grid} galleryRef={galleryRef} />
            ) : (
              <p className="py-10 text-center text-(--inv-muted)">{t("empty")}</p>
            )}
          </>
        ) : (
          <p className="py-10 text-center text-(--inv-muted)">{t(`state.${state}`)}</p>
        )}
      </div>
    </InvitationStage>
  );
}
