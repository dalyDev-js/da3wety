/** First letter of a name, grapheme-aware so combined Arabic marks are kept. */
function initial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const first = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed)[Symbol.iterator]().next();
    return first.done ? "" : first.value.segment;
  }
  return Array.from(trimmed)[0] ?? "";
}

/** "أ & س" for the envelope flap; a single initial when there is one honoree. */
export function monogram(primary: string, secondary?: string | null): string {
  const a = initial(primary);
  const b = secondary ? initial(secondary) : "";
  return b ? `${a} & ${b}` : a;
}
