"use client";

import { CheckIcon, DownloadIcon, Trash2Icon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { deletePhotos, moderatePhotos } from "@/actions/photos";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PhotoStatus } from "@/db/schema/enums";

export type HostPhoto = {
  id: string;
  thumbUrl: string;
  downloadUrl: string;
  uploaderName: string | null;
  status: PhotoStatus;
};

type Props = { eventId: string; photos: HostPhoto[]; moderation: boolean };

/** Host grid with multi-select: approve / reject / delete / download selected. */
export function ModerationGrid({ eventId, photos, moderation }: Props) {
  const t = useTranslations("Gallery");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const ids = [...selected];

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const act = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      setSelected(new Set());
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set(photos.map((p) => p.id)))}>
          {t("selectAll")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={!ids.length}>
          {t("clearSelection")}
        </Button>
        <span className="text-sm text-muted-foreground">{t("selectedCount", { count: ids.length })}</span>
        <div className="ms-auto flex flex-wrap gap-2">
          {moderation ? (
            <>
              <Button
                type="button"
                size="sm"
                disabled={!ids.length || pending}
                onClick={() => act(() => moderatePhotos(eventId, ids, "approved"))}
              >
                <CheckIcon />
                {t("approve")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!ids.length || pending}
                onClick={() => act(() => moderatePhotos(eventId, ids, "rejected"))}
              >
                <XIcon />
                {t("reject")}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!ids.length || pending}
            onClick={() =>
              photos.filter((p) => selected.has(p.id)).forEach((p) => window.open(p.downloadUrl, "_blank", "noopener"))
            }
          >
            <DownloadIcon />
            {t("downloadSelected")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={!ids.length || pending}
            onClick={() => act(() => deletePhotos(eventId, ids))}
          >
            <Trash2Icon />
            {t("deleteSelected")}
          </Button>
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((p) => (
          <li key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-muted">
            <label className="block size-full cursor-pointer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbUrl} alt={p.uploaderName ?? ""} loading="lazy" className="size-full object-cover" />
              <span className="absolute start-1 top-1 rounded bg-white/90 p-0.5">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={t("select")} />
              </span>
              {p.status !== "approved" ? (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[11px] text-white">
                  {t(`status.${p.status}`)}
                </span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
