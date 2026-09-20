/**
 * The double hairline of a printed invitation, with a small lozenge at the centre.
 * Reads `--inv-gold` inside an invitation theme scope and falls back to the brand gold.
 */
export function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-[var(--inv-gold,var(--color-gold))] opacity-70" />
      <span className="block size-2 rotate-45 border border-[var(--inv-gold,var(--color-gold))]" />
      <span className="h-px flex-1 bg-[var(--inv-gold,var(--color-gold))] opacity-70" />
    </div>
  );
}
