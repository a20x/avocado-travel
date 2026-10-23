import { sql } from 'drizzle-orm';
import {
  check,
  date,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Оценки сайта (docs/04-data-model.md). Одна оценка от посетителя в сутки: уникальная пара
 * «хэш IP + день» — второй голос за день база не примет даже при одновременных запросах.
 */
export const siteRatings = pgTable(
  'site_ratings',
  {
    id: serial().primaryKey(),
    score: smallint().notNull(),
    visitorHash: text().notNull(),
    /** День по Москве, за который поставлена оценка. */
    day: date({ mode: 'string' }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.visitorHash, table.day),
    check('site_ratings_score_range', sql`${table.score} between 1 and 5`),
  ],
);
