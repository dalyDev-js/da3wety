import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EventForm } from "@/components/dashboard/event-form";
import { requireHost } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("newEvent"), robots: { index: false } };
}

export default async function NewEventPage() {
  await requireHost();
  const t = await getTranslations("Dashboard");
  const tEvent = await getTranslations("Event");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("newEvent")}</h1>
        <p className="text-sm text-muted-foreground">{tEvent("newIntro")}</p>
      </div>
      {/* New events start on Basic, so gallery options are locked until an admin upgrades. */}
      <EventForm
        mode="create"
        defaults={{ timezone: "Africa/Cairo", locale: "ar", rsvpMode: "open" }}
        gating={{ gallery: false, moderation: false }}
      />
    </div>
  );
}
