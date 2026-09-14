"use client";

import { DownloadIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { deleteOwnPhoto } from "@/actions/photos";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { GalleryRef } from "@/lib/gallery-access";

export type GridPhoto = {
  id: string;
  thumbUrl: string;
  fullUrl: string;
  downloadUrl?: string;
  uploaderName: string | null;
  pending?: boolean;
  own?: boolean;
};

type Props = { photos: GridPhoto[]; galleryRef?: GalleryRef };

/** Masonry-ish grid of thumbnails with a full-size lightbox. Plain <img>: signed URLs. */
export function PhotoGrid({ photos, galleryRef }: Props) {
  const t = useTranslations("Gallery");
  const [open, setOpen] = useState<GridPhoto | null>(null);
  const [pending, startTransition] = useTransition();

  if (photos.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id} className="relative aspect-square overflow-hidden bg-(--inv-gold-soft)/40">
            <button type="button" className="size-full" onClick={() => setOpen(p)} aria-label={t("openPhoto")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumbUrl}
                alt={p.uploaderName ? t("photoBy", { name: p.uploaderName }) : ""}
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
            {p.pending ? (
              <span className="absolute inset-x-0 bottom-0 bg-(--inv-ink)/70 px-1 py-0.5 text-center text-[11px] text-(--inv-paper)">
                {t("pendingBadge")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent showCloseButton={false} className="max-w-3xl border-0 bg-black p-0 text-white sm:rounded-lg">
          <DialogTitle className="sr-only">{t("openPhoto")}</DialogTitle>
          {open ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open.fullUrl} alt="" className="max-h-[85dvh] w-full object-contain" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-linear-to-b from-black/60 to-transparent p-2">
                <span className="truncate px-2 text-sm">{open.uploaderName ?? ""}</span>
                <div className="flex gap-1">
                  {open.downloadUrl ? (
                    <a
                      href={open.downloadUrl}
                      download
                      className="rounded-full bg-white/15 p-2"
                      aria-label={t("download")}
                    >
                      <DownloadIcon className="size-5" />
                    </a>
                  ) : null}
                  {open.own && galleryRef ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteOwnPhoto(galleryRef, open.id);
                          setOpen(null);
                        })
                      }
                      className="rounded-full bg-white/15 p-2"
                      aria-label={t("deleteOwn")}
                    >
                      <Trash2Icon className="size-5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="rounded-full bg-white/15 p-2"
                    aria-label={t("close")}
                  >
                    <XIcon className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
