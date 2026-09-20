import type { ReactNode } from "react";

import { captionClass } from "@/components/invitation/caption";

export { captionClass as eyebrowClass };

type Props = { locale: string; children: ReactNode; className?: string };

/** Small-caps label above a heading (Latin: tracked uppercase; Arabic: medium weight, no tracking). */
export function Eyebrow({ locale, children, className = "" }: Props) {
  return <p className={`${captionClass(locale, "text-[12px]")} text-gold ${className}`}>{children}</p>;
}
