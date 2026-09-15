import { normalizeShortCode, QR_TOKEN_RE, SHORT_CODE_RE } from "@/lib/tokens";

/** The QR encodes a URL so any camera app can open the ticket; the token is opaque. */
export function ticketUrl(siteUrl: string, qrToken: string): string {
  return `${siteUrl.replace(/\/$/, "")}/q/${qrToken}`;
}

export type ScanInput = { kind: "qr"; value: string } | { kind: "short"; value: string };

/**
 * Accepts what the scanner or a person hands us: the full ticket URL, a bare
 * 22-char token, or a 6-char short code (with hyphens/spaces/lowercase).
 */
export function parseScanInput(raw: string): ScanInput | null {
  let value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
    value = last;
  } catch {
    /* not a URL */
  }
  if (QR_TOKEN_RE.test(value)) return { kind: "qr", value };
  const short = normalizeShortCode(value);
  if (SHORT_CODE_RE.test(short)) return { kind: "short", value: short };
  return null;
}

const QR_OPTIONS = { errorCorrectionLevel: "M" as const, margin: 4 };

export async function renderQrSvg(text: string): Promise<string> {
  const { toString } = await import("qrcode");
  return toString(text, { ...QR_OPTIONS, type: "svg", color: { dark: "#2a1a1dff", light: "#ffffffff" } });
}

export async function renderQrPng(text: string, width = 1024): Promise<Buffer> {
  const { toBuffer } = await import("qrcode");
  return toBuffer(text, { ...QR_OPTIONS, type: "png", width });
}
