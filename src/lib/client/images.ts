"use client";

import imageCompression from "browser-image-compression";

import { createClient } from "@/lib/supabase/client";

export type CompressOptions = {
  maxDimension: number;
  maxSizeMB: number;
  quality?: number;
  signal?: AbortSignal;
};

/** True for HEIC/HEIF files that non-Safari browsers hand us untouched. */
export function looksLikeHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Normalizes any phone photo to a JPEG at the requested size. Strips EXIF (GPS)
 * and bakes in orientation. HEIC is converted first with heic-to (lazy-loaded).
 */
export async function toJpeg(file: File, opts: CompressOptions): Promise<File> {
  let source: Blob = file;
  if (looksLikeHeic(file)) {
    const { heicTo } = await import("heic-to");
    source = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
  }
  const input =
    source instanceof File ? source : new File([source], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });

  return imageCompression(input, {
    maxWidthOrHeight: opts.maxDimension,
    maxSizeMB: opts.maxSizeMB,
    initialQuality: opts.quality ?? 0.85,
    fileType: "image/jpeg",
    useWebWorker: true,
    preserveExif: false,
    signal: opts.signal,
  });
}

export type SignedUploadTarget = { bucket: string; path: string; token: string };

/** PUTs a blob straight to Supabase Storage using a server-minted signed upload token. */
export async function uploadToSigned(
  target: SignedUploadTarget,
  blob: Blob,
  contentType = "image/jpeg",
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(target.bucket)
    .uploadToSignedUrl(target.path, target.token, blob, { contentType, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message);
}

/** Reads image dimensions from a blob (for the photos table). */
export function readImageSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}
