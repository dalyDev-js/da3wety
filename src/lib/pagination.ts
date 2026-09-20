/** Bound untrusted URL/query values before they become SQL offsets. */
export function pageNumber(value: unknown): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 1_000_000) : 1;
}
