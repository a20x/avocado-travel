import {
  boolean,
  char,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

// Имена колонок в базе — snake_case: Drizzle переводит их сам (casing: 'snake_case').

const createdAt = timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp({ withTimezone: true }).notNull().defaultNow();

/** Города: название, падежные формы и описание. Администратор заводит и правит их в админке. */
export const cities = pgTable('cities', {
  id: serial().primaryKey(),
  /** Адрес страницы `/destinations/<slug>`. Не меняется: на него ссылаются аэропорты и ссылки. */
  slug: text().notNull().unique(),
  name: text().notNull(),
  /** Название после «из»: «из Москвы». */
  nameFrom: text().notNull(),
  /** Название после «в»: «в Москву». */
  nameTo: text().notNull(),
  country: text().notNull(),
  description: text().notNull().default(''),
  /** Иллюстрация из public/images/destinations; новым городам — общая картинка. */
  image: text().notNull().default('/images/destinations/default.svg'),
  createdAt,
  updatedAt,
});

/** Аэропорты — реальные (docs/04-data-model.md). Город — по `city_slug`. */
export const airports = pgTable(
  'airports',
  {
    id: serial().primaryKey(),
    iata: char({ length: 3 }).notNull().unique(),
    name: text().notNull(),
    citySlug: text()
      .notNull()
      .references(() => cities.slug),
    lat: doublePrecision().notNull(),
    lon: doublePrecision().notNull(),
    timezone: text().notNull(),
  },
  // В одном городе бывает несколько аэропортов (Москва), поиск идёт по городу.
  (table) => [index().on(table.citySlug)],
);

/** Авиакомпании — выдуманные, с внутренним трёхбуквенным кодом вместо кода ИАТА. */
export const airlines = pgTable('airlines', {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  name: text().notNull(),
  color: text().notNull(),
  logo: text().notNull(),
  description: text().notNull(),
  baggageIncluded: boolean().notNull().default(false),
  createdAt,
  updatedAt,
});

/** Модели самолётов — «вид транспорта» из темы методички. */
export const aircraftModels = pgTable(
  'aircraft_models',
  {
    id: serial().primaryKey(),
    manufacturer: text().notNull(),
    model: text().notNull(),
    businessRows: integer().notNull(),
    businessLayout: text().notNull(),
    economyRows: integer().notNull(),
    economyLayout: text().notNull(),
  },
  (table) => [unique().on(table.manufacturer, table.model)],
);
