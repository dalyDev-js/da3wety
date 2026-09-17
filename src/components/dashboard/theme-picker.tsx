"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { THEMES } from "@/components/invitation/invitation-theme";
import { THEME_IDS, type ThemeId } from "@/db/schema/enums";
import { cn } from "@/lib/utils";

type Props = { name: "theme"; defaultValue: ThemeId };

/** Four swatches as native radios; the preview is a tiny envelope in the palette. */
export function ThemePicker({ name, defaultValue }: Props) {
  const t = useTranslations("Event.themes");
  const [value, setValue] = useState<ThemeId>(defaultValue);

  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {THEME_IDS.map((id) => {
        const theme = THEMES[id];
        const selected = value === id;
        return (
          <label
            key={id}
            className={cn(
              "cursor-pointer rounded-lg border p-2 transition-colors focus-within:ring-2 focus-within:ring-ring",
              selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={id}
              checked={selected}
              onChange={() => setValue(id)}
              className="sr-only"
            />
            <div
              aria-hidden="true"
              className="relative aspect-[4/3] overflow-hidden rounded-md"
              style={{ background: theme.paper }}
            >
              <div
                className="absolute inset-x-[12%] top-[30%] h-[60%] rounded-sm"
                style={{ background: theme.envelope.fold }}
              />
              <div
                className="absolute inset-x-[12%] top-[30%] h-[35%]"
                style={{ background: theme.envelope.flap, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
              />
              <span
                className="absolute top-[38%] left-1/2 -translate-x-1/2 font-heading text-xs"
                style={{ color: theme.envelope.monogram }}
              >
                A&amp;S
              </span>
              <span className="absolute right-2 bottom-2 size-3 rounded-full" style={{ background: theme.accent }} />
              <span className="absolute right-6 bottom-2 size-3 rounded-full" style={{ background: theme.gold }} />
            </div>
            <p className="mt-2 text-center text-sm">{t(id)}</p>
          </label>
        );
      })}
    </div>
  );
}
