import { sql } from "drizzle-orm";
import { boolean, foreignKey, pgPolicy, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { authUsers, authenticatedRole } from "drizzle-orm/supabase";

import { currentUserId, timestamps } from "./_shared";
import { localeEnum } from "./enums";

/**
 * One row per host (Supabase auth user). Created by the `handle_new_user` trigger
 * (see the custom SQL migration) and upserted defensively in the auth callback.
 * `authUsers` is imported for the FK only; it must never be re-exported from the
 * schema barrel or drizzle-kit would try to manage `auth.users`.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey(),
    email: text().notNull(),
    fullName: text(),
    avatarUrl: text(),
    locale: localeEnum().notNull().default("ar"),
    isAdmin: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_auth_users_fk",
    }).onDelete("cascade"),
    // Select-only: writes happen through the server (postgres role). An UPDATE policy
    // here would let a host flip is_admin through PostgREST.
    pgPolicy("profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.id} = ${currentUserId}`,
    }),
  ],
).enableRLS();

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
