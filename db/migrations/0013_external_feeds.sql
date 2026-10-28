CREATE TABLE "external_feeds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone,
	"last_error" text,
	"last_added" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "external_feeds_url_unique" UNIQUE("url"),
	CONSTRAINT "external_feeds_category" CHECK ("external_feeds"."category" in ('aviation', 'travel'))
);
--> statement-breakpoint
-- Ленты, которые раньше были списком в коде (src/modules/exchange/feeds.ts): после миграции
-- импорт продолжает работать с ними, а новости уже импортированных лент не теряют источник.
INSERT INTO "external_feeds" ("id", "name", "url", "category") VALUES
	('aviation21', 'Aviation21', 'https://aviation21.ru/feed/', 'aviation'),
	('tourdom', 'Турдом', 'https://www.tourdom.ru/rss/', 'travel'),
	('lenta-travel', 'Лента.ру — Путешествия', 'https://lenta.ru/rss/news/travel', 'travel')
ON CONFLICT DO NOTHING;
