"use client";

import { CameraIcon, ImagePlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { confirmPhotoUpload, reservePhotoUpload } from "@/actions/photos";
import { Progress } from "@/components/ui/progress";
import { readImageSize, toJpeg, uploadToSigned } from "@/lib/client/images";
import type { GalleryRef } from "@/lib/gallery-access";

const BATCH_LIMIT = 20;
const CONCURRENCY = 3;

type Props = { galleryRef: GalleryRef; uploaderName: string | null };

type Item = { id: string; file: File; state: "queued" | "working" | "done" | "failed" };

/**
 * Picks photos, normalizes them to JPEG (main 1600px + thumb 400px), reserves a row,
 * uploads both objects straight to Storage, then confirms. Runs a small pool so a
 * wedding's burst of uploads does not choke the phone.
 */
export function Uploader({ galleryRef, uploaderName }: Props) {
  const t = useTranslations("Gallery");
  const router = useRouter();
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);

  const setState = (id: string, state: Item["state"]) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, state } : i)));

  async function processOne(item: Item) {
    setState(item.id, "working");
    try {
      const [main, thumb] = await Promise.all([
        toJpeg(item.file, { maxDimension: 1600, maxSizeMB: 1.5 }),
        toJpeg(item.file, { maxDimension: 400, maxSizeMB: 0.12, quality: 0.8 }),
      ]);
      const { width, height } = await readImageSize(main);
      const reserved = await reservePhotoUpload({
        ref: galleryRef,
        sizeBytes: main.size,
        thumbBytes: thumb.size,
        width,
        height,
        uploaderName: uploaderName ?? undefined,
      });
      if (!reserved.ok) {
        toast.error(t(`errors.${reserved.reason}`));
        setState(item.id, "failed");
        return;
      }
      await Promise.all([
        uploadToSigned({ bucket: reserved.bucket, path: reserved.main.path, token: reserved.main.token }, main),
        uploadToSigned({ bucket: reserved.bucket, path: reserved.thumb.path, token: reserved.thumb.token }, thumb),
      ]);
      const confirmed = await confirmPhotoUpload(galleryRef, reserved.photoId);
      setState(item.id, confirmed.ok ? "done" : "failed");
    } catch (error) {
      console.error(error);
      setState(item.id, "failed");
    }
  }

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, BATCH_LIMIT);
    if (list.length > BATCH_LIMIT) toast.info(t("batchLimit", { count: BATCH_LIMIT }));
    const queue: Item[] = files.map((file, i) => ({ id: `${Date.now()}-${i}`, file, state: "queued" }));
    setItems(queue);
    setBusy(true);

    let cursor = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor++]!;
        await processOne(item);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

    setBusy(false);
    router.refresh();
    if (pickRef.current) pickRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const done = items.filter((i) => i.state === "done").length;
  const failed = items.filter((i) => i.state === "failed").length;
  const progress = items.length ? Math.round(((done + failed) / items.length) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => pickRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-(--inv-accent) px-4 py-3 font-semibold text-(--inv-paper) disabled:opacity-50"
        >
          <ImagePlusIcon className="size-5" />
          {t("choose")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          aria-label={t("takePhoto")}
          className="flex size-12 items-center justify-center rounded-full border border-(--inv-gold) text-(--inv-accent) disabled:opacity-50"
        >
          <CameraIcon className="size-5" />
        </button>
      </div>
      {/* No `capture` here so iOS/Android open the multi-select gallery picker. */}
      <input
        ref={pickRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {items.length ? (
        <div className="space-y-1" aria-live="polite">
          <Progress value={progress} />
          <p className="text-center text-sm text-(--inv-muted)">
            {busy ? t("uploading", { done, total: items.length }) : t("finished", { done, failed })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
