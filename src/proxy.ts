import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

/**
 * Only host surfaces go through the session refresh. Guest invitation pages, the
 * staff scanner, and /api (including the cron) never touch auth here.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/auth/:path*"],
};
