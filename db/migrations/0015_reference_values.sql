CREATE TABLE "reference_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "reference_values_kind_value_unique" UNIQUE("kind","value")
);
--> statement-breakpoint
-- Колонки сначала без NOT NULL: в действующих базах уже есть города и авиакомпании.
ALTER TABLE "airlines" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "airlines" ADD COLUMN "carrier_type" text;--> statement-breakpoint
ALTER TABLE "airlines" ADD COLUMN "base_city_slug" text;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "world_part" text;--> statement-breakpoint
-- Части света известных городов.
UPDATE "cities" SET "world_part" = v."world_part"
FROM (VALUES
	('moscow', 'Европа'),
	('saint-petersburg', 'Европа'),
	('kaliningrad', 'Европа'),
	('sochi', 'Европа'),
	('kazan', 'Европа'),
	('samara', 'Европа'),
	('ufa', 'Европа'),
	('mineralnye-vody', 'Европа'),
	('vladivostok', 'Азия'),
	('yekaterinburg', 'Азия'),
	('novosibirsk', 'Азия'),
	('krasnoyarsk', 'Азия'),
	('irkutsk', 'Азия'),
	('istanbul', 'Азия'),
	('dubai', 'Азия'),
	('yerevan', 'Азия'),
	('tashkent', 'Азия'),
	('beijing', 'Азия')
) AS v("slug", "world_part")
WHERE "cities"."slug" = v."slug";
--> statement-breakpoint
-- Города, заведённые на сайте: часть света — по часовому поясу первого аэропорта.
UPDATE "cities" SET "world_part" = COALESCE((
	SELECT CASE split_part("airports"."timezone", '/', 1)
		WHEN 'Asia' THEN 'Азия'
		WHEN 'Africa' THEN 'Африка'
		WHEN 'America' THEN 'Северная Америка'
		WHEN 'Australia' THEN 'Австралия и Океания'
		WHEN 'Pacific' THEN 'Австралия и Океания'
		ELSE 'Европа'
	END
	FROM "airports"
	WHERE "airports"."city_slug" = "cities"."slug"
	ORDER BY "airports"."id"
	LIMIT 1
), 'Европа')
WHERE "world_part" IS NULL;
--> statement-breakpoint
-- Авиакомпании демо-данных.
UPDATE "airlines" SET "country" = v."country", "carrier_type" = v."carrier_type", "base_city_slug" = v."base_city_slug"
FROM (VALUES
	('LST', 'Россия', 'Классическая', 'moscow'),
	('ORN', 'Узбекистан', 'Лоукост', 'tashkent'),
	('ARL', 'Россия', 'Классическая', 'kazan'),
	('STV', 'Россия', 'Лоукост', 'sochi'),
	('KRR', 'Турция', 'Классическая', 'istanbul'),
	('ALT', 'Россия', 'Классическая', 'irkutsk')
) AS v("code", "country", "carrier_type", "base_city_slug")
WHERE "airlines"."code" = v."code";
--> statement-breakpoint
-- Авиакомпании, заведённые на сайте: базовый город — откуда больше всего её рейсов, иначе первый
-- город по названию. Страну и тип администратор при необходимости поменяет в форме.
UPDATE "airlines" SET
	"country" = 'Россия',
	"carrier_type" = 'Классическая',
	"base_city_slug" = COALESCE((
		SELECT "airports"."city_slug"
		FROM "flights"
		INNER JOIN "airports" ON "airports"."id" = "flights"."origin_id"
		WHERE "flights"."airline_id" = "airlines"."id"
		GROUP BY "airports"."city_slug"
		ORDER BY count(*) DESC, "airports"."city_slug"
		LIMIT 1
	), (SELECT "slug" FROM "cities" ORDER BY "name" LIMIT 1))
WHERE "base_city_slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "airlines" ALTER COLUMN "country" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "airlines" ALTER COLUMN "carrier_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "airlines" ALTER COLUMN "base_city_slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "world_part" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "airlines" ADD CONSTRAINT "airlines_base_city_slug_cities_slug_fk" FOREIGN KEY ("base_city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Значения выпадающих списков: всё, что уже есть в данных, и общие варианты.
INSERT INTO "reference_values" ("kind", "value")
SELECT 'country', "country" FROM "cities"
UNION
SELECT 'country', "country" FROM "airlines"
UNION
SELECT 'world_part', "world_part" FROM "cities"
UNION
SELECT 'timezone', "timezone" FROM "airports"
UNION
SELECT 'airline_type', "carrier_type" FROM "airlines"
UNION
SELECT 'world_part', v FROM unnest(ARRAY['Австралия и Океания', 'Азия', 'Африка', 'Европа', 'Северная Америка', 'Южная Америка']) AS v
UNION
SELECT 'airline_type', v FROM unnest(ARRAY['Классическая', 'Лоукост', 'Чартерная']) AS v;
