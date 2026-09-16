CREATE TYPE "public"."theme_id" AS ENUM('ivory', 'sage', 'navy', 'noir');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "theme" "theme_id" DEFAULT 'ivory' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "gift_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "gift_handle" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "gift_note" text;