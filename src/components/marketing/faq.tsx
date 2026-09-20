import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { AppLocale } from "@/lib/i18n/config";

const ITEMS = ["app", "whatsapp", "edit", "photos", "payment"] as const;

export async function Faq({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.faq");
  return (
    <Section id="faq">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} />
      <Accordion type="single" collapsible className="mx-auto mt-12 max-w-2xl">
        {ITEMS.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="text-base">{t(`items.${key}.q`)}</AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">{t(`items.${key}.a`)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
