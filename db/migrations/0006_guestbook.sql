CREATE TYPE "public"."guestbook_hidden_reason" AS ENUM('stop_word', 'admin');--> statement-breakpoint
CREATE TABLE "guestbook_banned_hosts" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern" "inet" NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guestbook_banned_hosts_pattern_unique" UNIQUE("pattern")
);
--> statement-breakpoint
CREATE TABLE "guestbook_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_name" text NOT NULL,
	"message" text NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"hidden_reason" "guestbook_hidden_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guestbook_stop_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	CONSTRAINT "guestbook_stop_words_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE INDEX "guestbook_entries_is_visible_created_at_index" ON "guestbook_entries" USING btree ("is_visible","created_at");