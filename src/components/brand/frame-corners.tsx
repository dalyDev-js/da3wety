/* Double hairline frame with bracketed corners; hairlines stay 1px at any size. */
const OUTER = "M14 6H86A8 8 0 0 0 94 14V146A8 8 0 0 0 86 154H14A8 8 0 0 0 6 146V14A8 8 0 0 0 14 6Z";
const INNER =
  "M15.5 8.5H84.5A8 8 0 0 0 91.5 15.5V144.5A8 8 0 0 0 84.5 151.5H15.5A8 8 0 0 0 8.5 144.5V15.5A8 8 0 0 0 15.5 8.5Z";

/** Absolutely positioned inside a `relative` parent. Gold from the invitation theme, else the brand gold. */
export function FrameCorners({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 160"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 size-full text-[var(--inv-gold,var(--color-gold))] ${className}`}
    >
      <path d={OUTER} fill="none" stroke="currentColor" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
      <path d={INNER} fill="none" stroke="currentColor" strokeOpacity="0.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
