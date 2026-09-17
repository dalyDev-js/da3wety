import { notFound } from "next/navigation";

import { buildIcs, icsFilename } from "@/lib/calendar";
import { publicEnv } from "@/lib/env";
import { getVisibleEventBySlug } from "@/lib/invitation-access";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getVisibleEventBySlug(slug);
  if (!ctx) notFound();
  const { event } = ctx;
  const site = publicEnv().NEXT_PUBLIC_SITE_URL;
  const body = buildIcs({
    uid: `${event.id}@da3wety.com`,
    title: event.title,
    description: event.description,
    location: [event.venueName, event.venueAddress].filter(Boolean).join(", ") || null,
    start: event.startsAt,
    end: event.endsAt,
    url: `${site}/e/${slug}`,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(event.title)}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
