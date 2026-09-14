CREATE TYPE "public"."checkin_method" AS ENUM('qr', 'manual');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('wedding', 'engagement', 'henna', 'katb_ketab', 'birthday', 'graduation', 'other');--> statement-breakpoint
CREATE TYPE "public"."guest_source" AS ENUM('host', 'self');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('ar', 'en');--> statement-breakpoint
CREATE TYPE "public"."package_tier" AS ENUM('basic', 'standard', 'premium');--> statement-breakpoint
CREATE TYPE "public"."photo_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."photo_upload_state" AS ENUM('reserved', 'stored');--> statement-breakpoint
CREATE TYPE "public"."qr_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."rsvp_mode" AS ENUM('invite_only', 'open');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('attending', 'declined');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"locale" "locale" DEFAULT 'ar' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "packages" (
	"tier" "package_tier" PRIMARY KEY NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"price_egp" integer DEFAULT 0 NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_guests" integer,
	"gallery_enabled" boolean DEFAULT false NOT NULL,
	"moderation_enabled" boolean DEFAULT false NOT NULL,
	"max_photos" integer DEFAULT 0 NOT NULL,
	"photo_retention_days" smallint DEFAULT 7 NOT NULL,
	"checkin_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"package_tier" "package_tier" DEFAULT 'basic' NOT NULL,
	"event_type" "event_type" DEFAULT 'wedding' NOT NULL,
	"title" text NOT NULL,
	"honoree_primary" text NOT NULL,
	"honoree_secondary" text,
	"family_names" text,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"timezone" text DEFAULT 'Africa/Cairo' NOT NULL,
	"venue_name" text,
	"venue_address" text,
	"venue_maps_url" text,
	"cover_image_path" text,
	"reveal_image_path" text,
	"locale" "locale" DEFAULT 'ar' NOT NULL,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"rsvp_mode" "rsvp_mode" DEFAULT 'open' NOT NULL,
	"rsvp_deadline" timestamp with time zone,
	"open_rsvp_max_seats" smallint DEFAULT 2 NOT NULL,
	"gallery_enabled" boolean DEFAULT false NOT NULL,
	"gallery_moderation" boolean DEFAULT false NOT NULL,
	"gallery_expires_at" timestamp with time zone,
	"purge_started_at" timestamp with time zone,
	"gallery_purged_at" timestamp with time zone,
	"checkin_enabled" boolean DEFAULT false NOT NULL,
	"scanner_token" text,
	"scanner_token_rotated_at" timestamp with time zone,
	"scanner_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"token" text NOT NULL,
	"source" "guest_source" DEFAULT 'host' NOT NULL,
	"max_seats" smallint DEFAULT 1 NOT NULL,
	"group_label" text,
	"notes" text,
	"invite_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"seats" smallint DEFAULT 1 NOT NULL,
	"message" text,
	"response_count" smallint DEFAULT 1 NOT NULL,
	"responded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rsvps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "qr_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"token" text NOT NULL,
	"short_code" text NOT NULL,
	"status" "qr_status" DEFAULT 'active' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qr_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid NOT NULL,
	"qr_token_id" uuid,
	"method" "checkin_method" NOT NULL,
	"seats_admitted" smallint DEFAULT 1 NOT NULL,
	"scanned_by" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_id" uuid,
	"uploader_name" text,
	"upload_session" text NOT NULL,
	"storage_path" text NOT NULL,
	"thumb_path" text NOT NULL,
	"mime_type" text DEFAULT 'image/jpeg' NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"caption" text,
	"upload_state" "photo_upload_state" DEFAULT 'reserved' NOT NULL,
	"status" "photo_status" DEFAULT 'approved' NOT NULL,
	"moderated_at" timestamp with time zone,
	"moderated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "package_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"tier" "package_tier" NOT NULL,
	"assigned_by" uuid NOT NULL,
	"amount_egp" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "package_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_profiles_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_package_tier_packages_tier_fk" FOREIGN KEY ("package_tier") REFERENCES "public"."packages"("tier") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_qr_token_id_qr_tokens_id_fk" FOREIGN KEY ("qr_token_id") REFERENCES "public"."qr_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_moderated_by_profiles_id_fk" FOREIGN KEY ("moderated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_assignments" ADD CONSTRAINT "package_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_assignments" ADD CONSTRAINT "package_assignments_assigned_by_profiles_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_host_id_idx" ON "events" USING btree ("host_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_key" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "events_scanner_token_key" ON "events" USING btree ("scanner_token");--> statement-breakpoint
CREATE INDEX "events_gallery_expires_idx" ON "events" USING btree ("gallery_expires_at") WHERE "events"."gallery_purged_at" is null;--> statement-breakpoint
CREATE INDEX "guests_event_id_idx" ON "guests" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_token_key" ON "guests" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "guests_event_phone_key" ON "guests" USING btree ("event_id","phone") WHERE "guests"."phone" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_guest_id_key" ON "rsvps" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "rsvps_event_status_idx" ON "rsvps" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_tokens_token_key" ON "qr_tokens" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_tokens_event_short_code_key" ON "qr_tokens" USING btree ("event_id","short_code");--> statement-breakpoint
CREATE UNIQUE INDEX "qr_tokens_guest_active_key" ON "qr_tokens" USING btree ("guest_id") WHERE "qr_tokens"."status" = 'active';--> statement-breakpoint
CREATE INDEX "checkins_event_guest_idx" ON "checkins" USING btree ("event_id","guest_id");--> statement-breakpoint
CREATE INDEX "checkins_event_created_idx" ON "checkins" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "photos_event_status_created_idx" ON "photos" USING btree ("event_id","status","created_at");--> statement-breakpoint
CREATE INDEX "photos_event_session_idx" ON "photos" USING btree ("event_id","upload_session");--> statement-breakpoint
CREATE INDEX "photos_upload_state_created_idx" ON "photos" USING btree ("upload_state","created_at");--> statement-breakpoint
CREATE INDEX "package_assignments_event_idx" ON "package_assignments" USING btree ("event_id");--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "packages_select_authenticated" ON "packages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "events_select_own" ON "events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("events"."host_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "guests_select_host" ON "guests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.events e where e.id = "guests"."event_id" and e.host_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "rsvps_select_host" ON "rsvps" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.events e where e.id = "rsvps"."event_id" and e.host_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "qr_tokens_select_host" ON "qr_tokens" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.events e where e.id = "qr_tokens"."event_id" and e.host_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "checkins_select_host" ON "checkins" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.events e where e.id = "checkins"."event_id" and e.host_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "photos_select_host" ON "photos" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.events e where e.id = "photos"."event_id" and e.host_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "package_assignments_select_host" ON "package_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.events e where e.id = "package_assignments"."event_id" and e.host_id = (select auth.uid())));