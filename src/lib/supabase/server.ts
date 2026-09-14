import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

/**
 * Server Supabase client bound to the request cookies (Server Components,
 * Server Actions, Route Handlers). Session refresh itself happens in proxy.ts;
 * Server Components cannot set cookies, hence the try/catch around setAll.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: ignore, the proxy refreshes sessions.
        }
      },
    },
  });
}
