import { index, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

import { ownsEvent, timestamps } from "./_shared";
import { photoStatusEnum, photoUploadStateEnum } from "./enums";
import { events } from "./events";
import { guests } from "./guests";
import { profiles } from "./profiles";

/**
 * Guest gallery uploads. A row is inserted (`reserved`) before the browser uploads
 * directly to Storage, then marked `stored` on confirmation. Rows are deleted by the
 * cleanup cron together with their objects.
 */
export const photos = pgTable(
  "photos",
  {
    id: uuid().primaryKey().defaultRandom(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    /** Known when uploaded through a personal link. */
    guestId: uuid().references(() => guests.id, { onDelete: "set null" }),
    uploaderName: text(),
    /** Anonymous browser id (cookie) so a guest can delete their own uploads. */
    uploadSession: text().notNull(),
    /** `{eventId}/{photoId}.jpg` in the private `event-photos` bucket. */
    storagePath: text().notNull(),
    /** `{eventId}/thumbs/{photoId}.jpg`. */
    thumbPath: text().notNull(),
    mimeType: text().notNull().default("image/jpeg"),
    sizeBytes: integer().notNull().default(0),
    width: integer(),
    height: integer(),
    caption: text(),
    uploadState: photoUploadStateEnum().notNull().default("reserved"),
    status: photoStatusEnum().notNull().default("approved"),
    moderatedAt: timestamp({ withTimezone: true }),
    moderatedBy: uuid().references(() => profiles.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (t) => [
    index("photos_event_status_created_idx").on(t.eventId, t.status, t.createdAt),
    index("photos_event_session_idx").on(t.eventId, t.uploadSession),
    index("photos_upload_state_created_idx").on(t.uploadState, t.createdAt),
    pgPolicy("photos_select_host", {
      for: "select",
      to: authenticatedRole,
      using: ownsEvent(t.eventId),
    }),
  ],
).enableRLS();

export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
