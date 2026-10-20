import {
  boolean,
  char,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  unique,
} from 'drizzle-orm/pg-core';

// Имена колонок в базе — snake_case: Drizzle переводит их сам (casing: 'snake_case').

/** Аэропорты — реальные (docs/04-data-model.md). */
export const airports = pgTable(
  'airports',
  {
    id: serial().primaryKey(),
    iata: char({ length: 3 }).notNull().unique(),
    name: text().notNull(),
    city: text().notNull(),
    citySlug: text().notNull(),
    country: text().notNull(),
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
