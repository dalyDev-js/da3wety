import { MessageCircleIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GoldRule } from "@/components/brand/gold-rule";
import { Section } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";
import { supportWhatsAppUrl } from "@/lib/whatsapp";

/** Burgundy closing band with the sign-up CTA and, when configured, the WhatsApp contact. */
export async function CtaBand() {
  const t = await getTranslations("Landing.ctaBand");
  const whatsapp = supportWhatsAppUrl();
  return (
    <Section tone="primary" className="text-center">
      <h2 className="font-heading text-3xl font-bold text-balance sm:text-4xl">{t("title")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-lg text-primary-foreground/80">{t("subtitle")}</p>
      <GoldRule className="mx-auto mt-6 w-40" />
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="h-11 bg-gold px-6 text-base text-ink hover:bg-gold/90">
          <Link href="/dashboard">{t("cta")}</Link>
        </Button>
        {whatsapp ? (
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 border-primary-foreground/40 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              <MessageCircleIcon data-icon="inline-start" />
              {t("whatsapp")}
            </a>
          </Button>
        ) : null}
      </div>
    </Section>
  );
}
