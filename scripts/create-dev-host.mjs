// Creates (or resets) an email/password host for local development and e2e tests.
// Usage: node --env-file=.env.local scripts/create-dev-host.mjs [email] [password]
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] ?? "admin@local.test";
const password = process.argv[3] ?? "local-dev-password";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const existing = list?.users.find((u) => u.email === email);
if (existing) {
  await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  console.log(`updated ${email} (${existing.id})`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Dev Host" },
  });
  if (error) throw error;
  console.log(`created ${email} (${data.user.id})`);
}
