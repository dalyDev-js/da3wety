/**
 * Small-caps "caption" styling for labels (tap to open, scratch to reveal, the
 * invite line). Letter-spacing and uppercase only make sense for Latin script:
 * spacing between Arabic letters breaks their joining in several engines.
 */
export function captionClass(locale: string, size = "text-[11px]"): string {
  const latin = locale.startsWith("en");
  return latin ? `${size} font-medium tracking-[0.35em] uppercase` : `${size.replace("11px", "13px")} font-medium`;
}
