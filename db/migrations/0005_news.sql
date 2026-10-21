CREATE TYPE "public"."news_source" AS ENUM('site', 'external');--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"source" "news_source" DEFAULT 'site' NOT NULL,
	"external_url" text,
	"external_feed" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_slug_unique" UNIQUE("slug"),
	CONSTRAINT "news_externalUrl_unique" UNIQUE("external_url")
);
--> statement-breakpoint
CREATE INDEX "news_source_published_at_index" ON "news" USING btree ("source","published_at");