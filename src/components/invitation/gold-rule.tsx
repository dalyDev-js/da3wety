/** The double hairline of a printed invitation, with a small lozenge at the centre. */
export function GoldRule({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-(--inv-gold) opacity-70" />
      <span className="block size-2 rotate-45 border border-(--inv-gold)" />
      <span className="h-px flex-1 bg-(--inv-gold) opacity-70" />
    </div>
  );
}
