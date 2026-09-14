import "server-only";

import { serverEnv } from "@/lib/env";

/** Email/password sign-in is available only outside production and when opted in. */
export function devLoginEnabled(): boolean {
  const env = serverEnv();
  return env.NODE_ENV !== "production" && env.DEV_LOGIN_ENABLED;
}
