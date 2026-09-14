import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EventTabs } from "@/components/dashboard/event-tabs";
import { Badge } from "@/components/ui/badge";
import { getEventForHost } from "@/db/queries/events";
import { requireHost } from "@/lib/auth";
import { packageAllows } from "@/lib/packages";
import { z } from "@/lib/validation/zod-config";

export default async function EventLayout({ children, params }: LayoutProps<"/dashboard/events/[eventId]">) {
  const host = await requireHost();
  const { eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) notFound();
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) notFound();

  const t = await getTranslations("Event");
  const base = `/dashboard/events/${eventId}`;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{ctx.event.title}</h1>
          <Badge variant={ctx.event.status === "published" ? "default" : "secondary"}>{t(`statuses.${ctx.event.status}`)}</Badge>
          <Badge variant="outline">{t(`tiers.${ctx.event.packageTier}`)}</Badge>
        </div>
      </div>
      <EventTabs
        tabs={[
          { href: base, label: t("tabs.overview"), exact: true },
          { href: `${base}/edit`, label: t("tabs.edit") },
          { href: `${base}/guests`, label: t("tabs.guests") },
          { href: `${base}/gallery`, label: t("tabs.gallery"), locked: !packageAllows(ctx.pkg, "gallery") },
          { href: `${base}/checkin`, label: t("tabs.checkin"), locked: !packageAllows(ctx.pkg, "checkin") },
        ]}
      />
      {children}
    </div>
  );
}
