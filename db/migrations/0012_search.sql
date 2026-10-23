CREATE TYPE "public"."search_kind" AS ENUM('page', 'news', 'forum');--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "search_kind" NOT NULL,
	"ref_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visible_from" timestamp with time zone,
	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('russian', translate("title", 'Ёё', 'Ее')), 'A') || setweight(to_tsvector('russian', translate("body", 'Ёё', 'Ее')), 'B')) STORED NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_documents_kind_refId_unique" UNIQUE("kind","ref_id")
);
--> statement-breakpoint
CREATE INDEX "search_documents_tsv_index" ON "search_documents" USING gin ("tsv");