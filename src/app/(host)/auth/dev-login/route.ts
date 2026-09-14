import { NextResponse } from "next/server";

import { ensureProfile } from "@/db/queries/profiles";
import { devLoginEnabled } from "@/lib/dev-login";
import { enforceRateLimit, RateLimitedError, requestIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

/**
 * Email/password sign-in for local development and Playwright only.
 * Hard-disabled in production builds regardless of env, and rate-limited.
 */
export async function POST(request: Request) {
  if (!devLoginEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await enforceRateLimit({ scope: "dev-login", subject: await requestIp(), limit: 10, windowSeconds: 60 });
  } catch (e) {
    if (e instanceof RateLimitedError) return new NextResponse("Too many attempts", { status: 429 });
    throw e;
  }

  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=dev`, { status: 303 });
  }

  await ensureProfile({ id: data.user.id, email: data.user.email ?? null });
  return NextResponse.redirect(`${origin}/dashboard`, { status: 303 });
}
