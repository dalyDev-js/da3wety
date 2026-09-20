import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import type { AppLocale } from "@/lib/i18n/config";

const STEPS = ["create", "share", "track"] as const;

export async function HowItWorks({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.howItWorks");
  return (
    <Section id="how-it-works" tone="card">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} />
      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {STEPS.map((key, i) => (
          <li key={key} className="flex flex-col items-center gap-3 text-center">
            <span className="relative flex size-12 items-center justify-center">
              <span aria-hidden="true" className="absolute inset-0 rotate-45 border border-gold" />
              <span className="font-heading text-xl font-bold text-primary" dir="ltr">
                {i + 1}
              </span>
            </span>
            <h3 className="font-heading text-2xl font-bold">{t(`steps.${key}.title`)}</h3>
            <p className="max-w-xs text-muted-foreground">{t(`steps.${key}.body`)}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
