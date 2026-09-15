import { DownloadIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { GoldRule } from "@/components/invitation/gold-rule";
import type { QrToken } from "@/db/schema";
import { publicEnv } from "@/lib/env";
import { toIntlLocale, type AppLocale } from "@/lib/i18n/config";
import { renderQrSvg, ticketUrl } from "@/lib/qr";
import { formatShortCode } from "@/lib/tokens";

type Props = {
  locale: AppLocale;
  guestName: string;
  seats: number;
  ticket: QrToken;
  /** Where the PNG can be saved from (personal link only). */
  pngHref?: string;
};

/** The door pass: QR (inline SVG, crisp on any screen), short code, instructions. */
export async function Ticket({ locale, guestName, seats, ticket, pngHref }: Props) {
  const t = await getTranslations({ locale: toIntlLocale(locale), namespace: "Ticket" });
  const common = await getTranslations({ locale: toIntlLocale(locale), namespace: "Common" });
  const svg = await renderQrSvg(ticketUrl(publicEnv().NEXT_PUBLIC_SITE_URL, ticket.token));

  return (
    <section aria-labelledby="ticket-title" className="mx-auto w-full max-w-sm space-y-4 text-center">
      <h2 id="ticket-title" className="font-heading text-2xl">
        {t("title")}
      </h2>
      <p className="text-(--inv-muted)">{t("holder", { name: guestName, seats: common("seats", { count: seats }) })}</p>
      <div
        className="mx-auto w-72 max-w-full rounded-xl bg-white p-3 shadow-sm"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-sm text-(--inv-muted)">{t("codeLabel")}</p>
      <p dir="ltr" className="font-mono text-3xl font-semibold tracking-[0.25em] text-(--inv-ink)">
        {formatShortCode(ticket.shortCode)}
      </p>
      {pngHref ? (
        <a
          href={pngHref}
          download
          className="inline-flex items-center gap-2 rounded-full border border-(--inv-gold) px-5 py-2.5 text-(--inv-accent)"
        >
          <DownloadIcon className="size-4" />
          {t("save")}
        </a>
      ) : null}
      <p className="text-sm leading-relaxed text-(--inv-muted)">{t("instructions")}</p>
      <GoldRule />
    </section>
  );
}
