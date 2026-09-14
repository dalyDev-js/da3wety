import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Enum values are exported as const tuples so zod schemas and UI code can reuse them
 * without importing the Drizzle enum objects.
 */
export const PACKAGE_TIERS = ["basic", "standard", "premium"] as const;
export type PackageTier = (typeof PACKAGE_TIERS)[number];
export const packageTierEnum = pgEnum("package_tier", PACKAGE_TIERS);

export const EVENT_TYPES = [
  "wedding",
  "engagement",
  "henna",
  "katb_ketab",
  "birthday",
  "graduation",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const eventTypeEnum = pgEnum("event_type", EVENT_TYPES);

export const EVENT_STATUSES = ["draft", "published", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const eventStatusEnum = pgEnum("event_status", EVENT_STATUSES);

export const RSVP_MODES = ["invite_only", "open"] as const;
export type RsvpMode = (typeof RSVP_MODES)[number];
export const rsvpModeEnum = pgEnum("rsvp_mode", RSVP_MODES);

export const LOCALES = ["ar", "en"] as const;
export const localeEnum = pgEnum("locale", LOCALES);

export const GUEST_SOURCES = ["host", "self"] as const;
export type GuestSource = (typeof GUEST_SOURCES)[number];
export const guestSourceEnum = pgEnum("guest_source", GUEST_SOURCES);

export const RSVP_STATUSES = ["attending", "declined"] as const;
export type RsvpStatus = (typeof RSVP_STATUSES)[number];
export const rsvpStatusEnum = pgEnum("rsvp_status", RSVP_STATUSES);

export const PHOTO_STATUSES = ["pending", "approved", "rejected"] as const;
export type PhotoStatus = (typeof PHOTO_STATUSES)[number];
export const photoStatusEnum = pgEnum("photo_status", PHOTO_STATUSES);

export const PHOTO_UPLOAD_STATES = ["reserved", "stored"] as const;
export type PhotoUploadState = (typeof PHOTO_UPLOAD_STATES)[number];
export const photoUploadStateEnum = pgEnum("photo_upload_state", PHOTO_UPLOAD_STATES);

export const CHECKIN_METHODS = ["qr", "manual"] as const;
export type CheckinMethod = (typeof CHECKIN_METHODS)[number];
export const checkinMethodEnum = pgEnum("checkin_method", CHECKIN_METHODS);

export const QR_STATUSES = ["active", "revoked"] as const;
export type QrStatus = (typeof QR_STATUSES)[number];
export const qrStatusEnum = pgEnum("qr_status", QR_STATUSES);
