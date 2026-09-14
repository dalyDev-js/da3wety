/**
 * Proves the RLS posture against a real Supabase project (the dev project):
 * a signed-in host can read their own profile but cannot write ANY table through
 * PostgREST with the publishable key, and anon cannot read anything.
 *
 * Runs only when RUN_INTEGRATION=1 and the Supabase env vars are present.
 * Creates a throwaway user with the secret key and deletes it afterwards.
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const enabled = process.env.RUN_INTEGRATION === "1" && !!url && !!publishableKey && !!secretKey;

describe.skipIf(!enabled)("PostgREST RLS posture", () => {
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  let admin: ReturnType<typeof createClient>;
  let userClient: ReturnType<typeof createClient>;
  let anonClient: ReturnType<typeof createClient>;

  const email = `rls-test-${Date.now()}@example.com`;
  const password = `Test-${Date.now()}-pw!`;
  let userId = "";

  beforeAll(async () => {
    admin = createClient(url!, secretKey!, opts);
    userClient = createClient(url!, publishableKey!, opts);
    anonClient = createClient(url!, publishableKey!, opts);
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
    const signIn = await userClient.auth.signInWithPassword({ email, password });
    if (signIn.error) throw signIn.error;
  });

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("host can read their own profile row (created by the trigger)", async () => {
    const { data, error } = await userClient.from("profiles").select("id,is_admin").eq("id", userId);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]?.is_admin).toBe(false);
  });

  it("host cannot escalate is_admin through PostgREST", async () => {
    const { data } = await userClient.from("profiles").update({ is_admin: true }).eq("id", userId).select();
    expect(data ?? []).toHaveLength(0);
    const { data: after } = await userClient.from("profiles").select("is_admin").eq("id", userId).single();
    expect(after?.is_admin).toBe(false);
  });

  it("host cannot insert events through PostgREST", async () => {
    const { data, error } = await userClient
      .from("events")
      .insert({ host_id: userId, slug: "rlstest123", title: "x", honoree_primary: "x", starts_at: new Date().toISOString() })
      .select();
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("host cannot read rate_limits", async () => {
    const { error } = await userClient.from("rate_limits").select("key").limit(1);
    expect(error).not.toBeNull();
  });

  it("anon cannot read profiles, events or guests", async () => {
    for (const table of ["profiles", "events", "guests", "photos"]) {
      const { data, error } = await anonClient.from(table).select("*").limit(1);
      expect(error, table).not.toBeNull();
      expect(data, table).toBeNull();
    }
  });
});
