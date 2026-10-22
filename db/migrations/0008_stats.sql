CREATE TABLE "page_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"section" text NOT NULL,
	"visitor_hash" text NOT NULL,
	"referrer_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "page_views_created_at_index" ON "page_views" USING btree ("created_at");