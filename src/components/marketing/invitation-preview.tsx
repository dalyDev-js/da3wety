import { getTranslations } from "next-intl/server";

import { Eyebrow } from "@/components/brand/eyebrow";
import { FrameCorners } from "@/components/brand/frame-corners";
import { GoldRule } from "@/components/brand/gold-rule";
import { invitationThemeStyle } from "@/components/invitation/invitation-theme";
import type { AppLocale } from "@/lib/i18n/config";

/**
 * Static product shot of an ivory invitation for the hero. Purely presentational:
 * no data, no interaction, CSS-only entrance (tw-animate-css) that respects reduced motion.
 */
export async function InvitationPreview({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.preview");
  return (
    <div
      aria-hidden="true"
      style={invitationThemeStyle("ivory")}
      className="relative mx-auto aspect-[5/8] w-full max-w-[320px] rounded-sm bg-(--inv-paper) text-(--inv-ink) shadow-2xl shadow-ink/20 motion-safe:animate-in motion-safe:duration-700 motion-safe:fade-in motion-safe:slide-in-from-bottom-4"
    >
      <FrameCorners />
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-5 px-[14%] py-[12%] text-center">
        <Eyebrow locale={locale} className="text-(--inv-gold)">
          {t("eyebrow")}
        </Eyebrow>
        <p className="font-heading text-4xl leading-tight font-bold">
          {t("primary")}
          <span className="mx-2 text-(--inv-gold)">{t("and")}</span>
          {t("secondary")}
        </p>
        <GoldRule className="w-3/4" />
        <p className="font-heading text-lg">{t("date")}</p>
        <div className="mt-2 flex gap-2">
          <span className="rounded-full bg-(--inv-accent) px-4 py-1.5 text-xs font-medium text-(--inv-paper)">
            {t("attending")}
          </span>
          <span className="rounded-full border border-(--inv-gold) px-4 py-1.5 text-xs font-medium">
            {t("declined")}
          </span>
        </div>
      </div>
    </div>
  );
}
