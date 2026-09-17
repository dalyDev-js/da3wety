"use client";

import { useFormatter } from "next-intl";
import { useEffect, useState } from "react";

import { captionClass } from "@/components/invitation/caption";
import { countdownParts, type CountdownParts } from "@/lib/countdown";

type Props = {
  target: string;
  locale: string;
  labels: { days: string; hours: string; minutes: string; label: string };
};

/** Days / hours / minutes to the event, re-computed once a minute. */
export function Countdown({ target, locale, labels }: Props) {
  const format = useFormatter();
  const [parts, setParts] = useState<CountdownParts | null>(null);

  useEffect(() => {
    const goal = new Date(target);
    const tick = () => setParts(countdownParts(goal, new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [target]);

  if (!parts) return null;

  const cell = (value: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="font-heading text-3xl leading-none tabular-nums">{format.number(value)}</span>
      <span className={`mt-1 text-(--inv-muted) ${captionClass(locale, "text-[10px]")}`}>{label}</span>
    </div>
  );

  return (
    <div className="space-y-2" aria-live="off">
      <p className={`text-(--inv-muted) ${captionClass(locale)}`}>{labels.label}</p>
      <div className="flex items-center justify-center gap-4">
        {cell(parts.days, labels.days)}
        <span className="h-7 w-px bg-(--inv-gold)/40" />
        {cell(parts.hours, labels.hours)}
        <span className="h-7 w-px bg-(--inv-gold)/40" />
        {cell(parts.minutes, labels.minutes)}
      </div>
    </div>
  );
}
