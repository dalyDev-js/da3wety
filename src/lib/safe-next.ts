/**
 * Post-login destination guard: only same-origin relative paths are accepted.
 * Rejects protocol-relative ("//evil"), backslash tricks and absolute URLs.
 */
export function safeNext(value: string | string[] | null | undefined, fallback = "/dashboard"): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\u0000-\u0020\u007f]/.test(v)) {
    return fallback;
  }
  return v;
}
