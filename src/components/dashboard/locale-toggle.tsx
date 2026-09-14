"use client";

import { LanguagesIcon } from "lucide-react";
import { useTransition } from "react";

import { setLocale } from "@/actions/locale";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/config";

type Props = {
  current: AppLocale;
  labels: { ar: string; en: string; language: string };
};

/** Switches between Arabic and English for the host dashboard. */
export function LocaleToggle({ current, labels }: Props) {
  const [pending, startTransition] = useTransition();
  const next: AppLocale = current === "ar" ? "en" : "ar";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={labels.language}
      disabled={pending}
      onClick={() => startTransition(() => setLocale(next))}
    >
      <LanguagesIcon />
      <span>{labels[next]}</span>
    </Button>
  );
}
