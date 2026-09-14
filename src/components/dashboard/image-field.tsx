"use client";

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { createAssetUpload } from "@/actions/events";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { toJpeg, uploadToSigned } from "@/lib/client/images";

type Props = {
  name: "coverImagePath" | "revealImagePath";
  kind: "cover" | "reveal";
  eventId: string;
  label: string;
  description: string;
  initialPath: string | null;
  publicBaseUrl: string;
  aspect?: "video" | "square";
};

/**
 * Cover / reveal image upload: compress in the browser, mint a signed upload for
 * this event, upload straight to Storage, and submit the new object path with the form.
 */
export function ImageField({ name, kind, eventId, label, description, initialPath, publicBaseUrl, aspect = "video" }: Props) {
  const t = useTranslations("Event");
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(initialPath);
  const [preview, setPreview] = useState<string | null>(initialPath ? `${publicBaseUrl}/${initialPath}` : null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const jpeg = await toJpeg(file, { maxDimension: 2000, maxSizeMB: 2 });
      const result = await createAssetUpload({ eventId, kind, mimeType: "image/jpeg", sizeBytes: jpeg.size });
      if (!result.ok) throw new Error("upload rejected");
      await uploadToSigned({ bucket: result.bucket, path: result.upload.path, token: result.upload.token }, jpeg);
      setPath(result.upload.path);
      setPreview(URL.createObjectURL(jpeg));
      toast.success(t("imageUploaded"));
    } catch (error) {
      console.error(error);
      toast.error(t("imageUploadFailed"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input type="hidden" name={name} value={path ?? ""} />
      <div className={`bg-muted relative overflow-hidden rounded-lg border ${aspect === "square" ? "aspect-square max-w-xs" : "aspect-video"}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL / public bucket, not optimized
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center">
            <ImageIcon className="size-8" />
          </div>
        )}
        {busy ? (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center">
            <Spinner />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          <UploadIcon />
          {path ? t("replaceImage") : t("chooseImage")}
        </Button>
        {path ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              setPath(null);
              setPreview(null);
            }}
          >
            <Trash2Icon />
            {t("removeImage")}
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}
