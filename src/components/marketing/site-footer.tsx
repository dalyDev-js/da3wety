import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GoldRule } from "@/components/brand/gold-rule";
import { Wordmark } from "@/components/brand/wordmark";
import { supportWhatsAppUrl } from "@/lib/whatsapp";

const LINK = "text-muted-foreground transition-colors hover:text-foreground";

export async function SiteFooter() {
  const [t, nav] = await Promise.all([getTranslations("Landing.footer"), getTranslations("Landing.nav")]);
  const whatsapp = supportWhatsAppUrl();
  return (
    <footer className="border-t border-gold/30 bg-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-12 text-center">
        <Wordmark size="md" href="/" />
        <p className="text-sm text-muted-foreground">{t("tagline")}</p>
        <GoldRule className="w-40" />
        <nav aria-label="footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a href="#pricing" className={LINK}>
            {nav("pricing")}
          </a>
          <a href="#faq" className={LINK}>
            {nav("faq")}
          </a>
          <Link href="/login" className={LINK}>
            {nav("login")}
          </Link>
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 ${LINK}`}
            >
              <MessageCircleIcon className="size-4" />
              {t("whatsapp")}
            </a>
          ) : null}
        </nav>
        <p className="text-xs text-muted-foreground">{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
