import { NextResponse } from "next/server";

import { ensureProfile } from "@/db/queries/profiles";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Google OAuth (PKCE) callback: exchanges the code for a session, makes sure the
 * profile row exists, then redirects to `next`. Mirrors the Supabase docs partial,
 * including the x-forwarded-host handling behind Vercel's load balancer.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};
      try {
        await ensureProfile({
          id: data.user.id,
          email: data.user.email ?? null,
          fullName: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
          avatarUrl: (meta.avatar_url as string | undefined) ?? (meta.picture as string | undefined) ?? null,
        });
      } catch (e) {
        console.error(JSON.stringify({ level: "error", scope: "auth.callback", message: "ensureProfile failed", error: String(e) }));
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      if (isLocal) return NextResponse.redirect(`${origin}${next}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
