import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";

const PUBLIC_HOST_PATHS = ["/login", "/auth"];

/**
 * Refreshes the Supabase session cookie and gates host-only paths.
 * Follows supabase/examples/auth/nextjs-full/lib/supabase/proxy.ts:
 * - do not run code between createServerClient and getClaims()
 * - forward the cache headers handed to setAll (prevents CDN caching of Set-Cookie)
 * - return supabaseResponse unmodified (or copy its cookies onto a new response)
 * Authorization is re-checked inside every page and server action; this is only
 * an optimistic pre-filter.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const env = publicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_HOST_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isSignedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  if (isSignedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get("next");
    url.pathname = safeNext(next);
    url.search = "";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return supabaseResponse;
}
