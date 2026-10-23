CREATE TYPE "public"."ad_event_type" AS ENUM('impression', 'click');--> statement-breakpoint
CREATE TYPE "public"."ad_placement" AS ENUM('home', 'search');--> statement-breakpoint
CREATE TABLE "ad_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"image" text NOT NULL,
	"target_url" text NOT NULL,
	"placement" "ad_placement" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ad_campaigns_period" CHECK ("ad_campaigns"."ends_at" > "ad_campaigns"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "ad_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"type" "ad_event_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_campaign_id_ad_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."ad_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ad_campaigns_placement_starts_at_index" ON "ad_campaigns" USING btree ("placement","starts_at");--> statement-breakpoint
CREATE INDEX "ad_events_campaign_id_type_created_at_index" ON "ad_events" USING btree ("campaign_id","type","created_at");