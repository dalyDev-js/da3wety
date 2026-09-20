import { publicEnv } from "@/lib/public-env";

/** wa.me deep link to the support number, or null when NEXT_PUBLIC_SUPPORT_WHATSAPP is unset. */
export function supportWhatsAppUrl(text?: string): string | null {
  const raw = publicEnv().NEXT_PUBLIC_SUPPORT_WHATSAPP;
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}
