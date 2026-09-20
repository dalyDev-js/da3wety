import { cn } from "cn";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/brand/eyebrow";
import { GoldRule } from "@/components/brand/gold-rule";

const TONES = {
  paper: "bg-background",
  card: "bg-card",
  primary: "bg-primary text-primary-foreground",
} as const;

type SectionProps = { id?: string; tone?: keyof typeof TONES; className?: string; children: ReactNode };

/** Full-width band with a centred, padded content column. `scroll-mt` clears the sticky header. */
export function Section({ id, tone = "paper", className, children }: SectionProps) {
  return (
    <section id={id} className={cn(TONES[tone], "scroll-mt-16")}>
      <div className={cn("mx-auto w-full max-w-6xl px-4 py-16 sm:py-24", className)}>{children}</div>
    </section>
  );
}

type HeadingProps = {
  locale: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "start";
  className?: string;
};

export function SectionHeading({ locale, eyebrow, title, subtitle, align = "center", className }: HeadingProps) {
  const centred = align === "center";
  return (
    <div className={cn("max-w-2xl space-y-3", centred ? "mx-auto text-center" : "text-start", className)}>
      <Eyebrow locale={locale}>{eyebrow}</Eyebrow>
      <h2 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{title}</h2>
      {subtitle ? <p className="text-lg text-pretty text-muted-foreground">{subtitle}</p> : null}
      <GoldRule className={cn("w-40", centred && "mx-auto")} />
    </div>
  );
}
