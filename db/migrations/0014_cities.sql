CREATE TABLE "cities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_from" text NOT NULL,
	"name_to" text NOT NULL,
	"country" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '/images/destinations/default.svg' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Перенос данных: города собираются из аэропортов (название и страна — как были у первого
-- аэропорта города), падежные формы, описания и иллюстрации раньше хранились в коде.
INSERT INTO "cities" ("slug", "name", "name_from", "name_to", "country")
SELECT DISTINCT ON ("city_slug") "city_slug", "city", "city", "city", "country"
FROM "airports"
ORDER BY "city_slug", "id";
--> statement-breakpoint
UPDATE "cities" SET "name_from" = v."name_from", "name_to" = v."name_to", "image" = v."image", "description" = v."description"
FROM (VALUES
	('moscow', 'Москвы', 'Москву', '/images/destinations/moscow.svg', 'Столица и главный узел нашей сети: отсюда есть прямые рейсы во все города. Три аэропорта — Шереметьево, Внуково и Домодедово, поэтому при покупке билета стоит смотреть, из какого именно вылетает рейс.'),
	('saint-petersburg', 'Санкт-Петербурга', 'Санкт-Петербург', '/images/destinations/saint-petersburg.svg', 'Город белых ночей, разводных мостов и Эрмитажа. Пулково — второй по числу рейсов аэропорт сети: прямые перелёты в крупные города России и за рубеж.'),
	('kaliningrad', 'Калининграда', 'Калининград', '/images/destinations/kaliningrad.svg', 'Самый западный регион страны: Балтийское море, Куршская коса и янтарь. Из-за расположения добраться сюда проще всего самолётом.'),
	('sochi', 'Сочи', 'Сочи', '/images/destinations/sochi.svg', 'Курорт на два сезона: летом — море, зимой — горнолыжная Красная Поляна. Рейсы в Сочи есть почти из всех городов сети.'),
	('kazan', 'Казани', 'Казань', '/images/destinations/kazan.svg', 'Столица Татарстана, где рядом стоят мечеть Кул-Шариф и Благовещенский собор. Удобна для поездки на выходные: из Москвы лететь меньше двух часов.'),
	('vladivostok', 'Владивостока', 'Владивосток', '/images/destinations/vladivostok.svg', 'Город на берегу Тихого океана в конце Транссиба. Самый дальний город сети внутри страны — девять часов полёта из Москвы.'),
	('yekaterinburg', 'Екатеринбурга', 'Екатеринбург', '/images/destinations/yekaterinburg.svg', 'Столица Урала на границе Европы и Азии. Деловой город с конструктивистской архитектурой и прямыми рейсами в Сочи и Дубай.'),
	('novosibirsk', 'Новосибирска', 'Новосибирск', '/images/destinations/novosibirsk.svg', 'Крупнейший город Сибири и пересадочный узел на востоке сети. Отсюда летают в Пекин, Ташкент и соседние сибирские города.'),
	('samara', 'Самары', 'Самару', '/images/destinations/samara.svg', 'Волжский город с самой длинной в стране набережной. Рейсы в Москву каждый день и в Сочи несколько раз в неделю.'),
	('ufa', 'Уфы', 'Уфу', '/images/destinations/ufa.svg', 'Столица Башкортостана на высоком берегу реки Белой. Рядом — Уральские горы и десятки озёр.'),
	('krasnoyarsk', 'Красноярска', 'Красноярск', '/images/destinations/krasnoyarsk.svg', 'Город на Енисее рядом с заповедником «Столбы». Прямые рейсы в Москву, Новосибирск и Иркутск.'),
	('irkutsk', 'Иркутска', 'Иркутск', '/images/destinations/irkutsk.svg', 'Ворота к Байкалу: до озера около часа на машине. Связан рейсами с Москвой, Красноярском и Владивостоком.'),
	('mineralnye-vody', 'Минеральных Вод', 'Минеральные Воды', '/images/destinations/mineralnye-vody.svg', 'Воздушные ворота Кавказских Минеральных Вод — Пятигорска, Кисловодска и Ессентуков. Сюда едут на лечение и в горы.'),
	('istanbul', 'Стамбула', 'Стамбул', '/images/destinations/istanbul.svg', 'Город на двух континентах по берегам Босфора. Летаем из Москвы, Санкт-Петербурга и Казани.'),
	('dubai', 'Дубая', 'Дубай', '/images/destinations/dubai.svg', 'Небоскрёбы, пустыня и тёплое море круглый год. Самый популярный зарубежный курорт в нашей сети.'),
	('yerevan', 'Еревана', 'Ереван', '/images/destinations/yerevan.svg', 'Один из древнейших городов мира с видом на Арарат. Перелёт из Москвы — около трёх часов.'),
	('tashkent', 'Ташкента', 'Ташкент', '/images/destinations/tashkent.svg', 'Столица Узбекистана: восточные базары, голубые купола и плов. Отсюда удобно ехать в Самарканд и Бухару.'),
	('beijing', 'Пекина', 'Пекин', '/images/destinations/beijing.svg', 'Столица Китая: Запретный город, храм Неба и Великая стена в часе езды. Летаем из Москвы и Новосибирска.')
) AS v("slug", "name_from", "name_to", "image", "description")
WHERE "cities"."slug" = v."slug";
--> statement-breakpoint
ALTER TABLE "airlines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "airlines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "airports" ADD CONSTRAINT "airports_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "airports" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "airports" DROP COLUMN "country";
