import { getTranslations } from "next-intl/server";

import { THEMES } from "@/components/invitation/invitation-theme";
import { Section, SectionHeading } from "@/components/marketing/section";
import { THEME_IDS } from "@/db/schema/enums";
import type { AppLocale } from "@/lib/i18n/config";

/** Four miniature cards painted with the real invitation palettes. */
export async function ThemeStrip({ locale }: { locale: AppLocale }) {
  const [t, preview] = await Promise.all([getTranslations("Landing.themes"), getTranslations("Landing.preview")]);
  return (
    <Section>
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} />
      <ul className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {THEME_IDS.map((id) => {
          const theme = THEMES[id];
          return (
            <li key={id} className="space-y-3 text-center">
              <div
                aria-hidden="true"
                className="mx-auto aspect-[5/6] w-full max-w-[180px] rounded-sm border shadow-md"
                style={{ backgroundColor: theme.paper, borderColor: theme.gold }}
              >
                <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
                  <span className="font-heading text-2xl" style={{ color: theme.ink }}>
                    {preview("primary")} <span style={{ color: theme.gold }}>{preview("and")}</span>{" "}
                    {preview("secondary")}
                  </span>
                  <span className="h-px w-2/3" style={{ backgroundColor: theme.gold }} />
                  <span
                    className="rounded-full px-3 py-1 text-[10px] font-medium"
                    style={{ backgroundColor: theme.accent, color: theme.paper }}
                  >
                    {preview("attending")}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium">{t(`names.${id}`)}</p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
