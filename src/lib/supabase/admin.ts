import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Privileged Supabase client (secret key, bypasses RLS). Server-only by construction.
 * Used for Storage (signed upload/read URLs, deletes), auth admin, and nothing else.
 */
let cached: ReturnType<typeof createClient> | undefined;

export function createAdminClient() {
  cached ??= createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
