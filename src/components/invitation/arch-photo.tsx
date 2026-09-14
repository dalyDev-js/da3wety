/**
 * The couple photo inside a pointed arch: an SVG clipPath in object-bounding-box
 * units so it scales with the frame, nested twice to draw a gold rim.
 */
export function ArchPhoto({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={`relative mx-auto w-56 sm:w-64 ${className}`}>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <clipPath id="inv-arch" clipPathUnits="objectBoundingBox">
            <path d="M0.5 0 C0.78 0.06 0.96 0.22 1 0.42 L1 1 L0 1 L0 0.42 C0.04 0.22 0.22 0.06 0.5 0 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="aspect-4/5 bg-(--inv-gold) p-[3px]" style={{ clipPath: "url(#inv-arch)" }}>
        <div className="size-full bg-(--inv-paper)" style={{ clipPath: "url(#inv-arch)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- public bucket URL; sized by CSS */}
          <img src={src} alt={alt} className="size-full object-cover" loading="eager" fetchPriority="high" />
        </div>
      </div>
    </figure>
  );
}
