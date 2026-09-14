import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EventForm } from "@/components/dashboard/event-form";
import { getEventForHost } from "@/db/queries/events";
import { requireHost } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { eventToFormDefaults } from "@/lib/event-form-defaults";
import { packageAllows } from "@/lib/packages";
import { BUCKETS } from "@/lib/storage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Event");
  return { title: t("tabs.edit"), robots: { index: false } };
}

export default async function EditEventPage({ params, searchParams }: PageProps<"/dashboard/events/[eventId]/edit">) {
  const host = await requireHost();
  const { eventId } = await params;
  const { created } = await searchParams;
  const ctx = await getEventForHost(eventId, host.id);
  if (!ctx) notFound();
  const t = await getTranslations("Event");

  const publicBaseUrl = `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKETS.assets}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {created ? (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {t("createdNext")}
        </p>
      ) : null}
      <EventForm
        mode="edit"
        eventId={eventId}
        defaults={eventToFormDefaults(ctx.event)}
        gating={{ gallery: packageAllows(ctx.pkg, "gallery"), moderation: packageAllows(ctx.pkg, "moderation") }}
        publicBaseUrl={publicBaseUrl}
      />
    </div>
  );
}
