import { getTranslations } from "next-intl/server";

import { CopyHandle } from "@/components/invitation/copy-handle";
import type { Event } from "@/db/schema";
import type { IntlLocale } from "@/lib/i18n/config";

type Props = { event: Pick<Event, "giftEnabled" | "giftHandle" | "giftNote">; locale: IntlLocale };

/** Optional نقوط block: note, the handle in large ltr text, and a copy button. */
export async function GiftSection({ event, locale }: Props) {
  if (!event.giftEnabled || !event.giftHandle) return null;
  const t = await getTranslations({ locale, namespace: "Gift" });
  return (
    <section className="w-full space-y-3 text-center">
      <p className="font-heading text-xl">{t("title")}</p>
      {event.giftNote ? <p className="text-(--inv-muted)">{event.giftNote}</p> : null}
      <p id="gift-handle" dir="ltr" className="font-mono text-lg select-all">
        {event.giftHandle}
      </p>
      <CopyHandle value={event.giftHandle} label={t("copy")} copiedLabel={t("copied")} />
      <p className="text-xs text-(--inv-muted)">{t("hint")}</p>
    </section>
  );
}
