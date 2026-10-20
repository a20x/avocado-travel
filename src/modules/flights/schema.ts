import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { aircraftModels, airlines, airports } from '@/modules/catalog-data';

/** Рейсы (docs/04-data-model.md). Время — UTC, цены — копейки. */
export const flights = pgTable(
  'flights',
  {
    id: uuid().primaryKey().defaultRandom(),
    number: text().notNull(),
    airlineId: integer()
      .notNull()
      .references(() => airlines.id),
    aircraftModelId: integer()
      .notNull()
      .references(() => aircraftModels.id),
    originId: integer()
      .notNull()
      .references(() => airports.id),
    destinationId: integer()
      .notNull()
      .references(() => airports.id),
    departsAt: timestamp({ withTimezone: true }).notNull(),
    arrivesAt: timestamp({ withTimezone: true }).notNull(),
    priceEconomy: integer().notNull(),
    priceBusiness: integer().notNull(),
  },
  (table) => [
    // Поиск: откуда, куда, в какие сутки.
    index().on(table.originId, table.destinationId, table.departsAt),
    // Рейс с одним номером вылетает не чаще раза в одно и то же время.
    unique().on(table.number, table.departsAt),
    // Защита от ошибок в данных — проверяет сама база.
    check('flights_arrival_after_departure', sql`${table.arrivesAt} > ${table.departsAt}`),
    check('flights_different_airports', sql`${table.originId} <> ${table.destinationId}`),
    check('flights_prices_positive', sql`${table.priceEconomy} > 0 AND ${table.priceBusiness} > 0`),
  ],
);
