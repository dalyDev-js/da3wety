import { ImagesIcon, MailOpenIcon, MessageCircleIcon, QrCodeIcon, ScanLineIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/marketing/section";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppLocale } from "@/lib/i18n/config";

const FEATURES = [
  { key: "envelope", Icon: MailOpenIcon },
  { key: "rsvp", Icon: UsersIcon },
  { key: "whatsapp", Icon: MessageCircleIcon },
  { key: "tickets", Icon: QrCodeIcon },
  { key: "gallery", Icon: ImagesIcon },
  { key: "checkin", Icon: ScanLineIcon },
] as const;

export async function FeatureGrid({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("Landing.features");
  return (
    <Section id="features">
      <SectionHeading locale={locale} eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, Icon }) => (
          <li key={key}>
            <Card className="h-full">
              <CardHeader>
                <span className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-gold-soft/40 text-primary">
                  <Icon className="size-5" />
                </span>
                <CardTitle className="text-xl">{t(`items.${key}.title`)}</CardTitle>
                <CardDescription className="text-base">{t(`items.${key}.body`)}</CardDescription>
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}
