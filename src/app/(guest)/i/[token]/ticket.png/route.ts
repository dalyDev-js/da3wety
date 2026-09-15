import { NextResponse } from "next/server";

import { getEventByGuestToken } from "@/db/queries/events";
import { db } from "@/db";
import { publicEnv } from "@/lib/env";
import { renderQrPng, ticketUrl } from "@/lib/qr";
import { getActiveTicket } from "@/lib/tickets";
import { GUEST_TOKEN_RE } from "@/lib/tokens";

export const runtime = "nodejs";

/** PNG of the guest's own ticket, addressable only with their personal token. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = GUEST_TOKEN_RE.test(token) ? await getEventByGuestToken(token) : null;
  if (!ctx) return new NextResponse("Not found", { status: 404 });
  const ticket = await getActiveTicket(db, ctx.guest.id);
  if (!ticket) return new NextResponse("Not found", { status: 404 });

  const png = await renderQrPng(ticketUrl(publicEnv().NEXT_PUBLIC_SITE_URL, ticket.token));
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `attachment; filename="da3wety-ticket.png"`,
      "X-Robots-Tag": "noindex",
    },
  });
}
