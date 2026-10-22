import { bigserial, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Просмотры страниц (docs/04-data-model.md). IP не хранится: вместо него хэш IP с солью
 * и датой — по нему считаются уникальные посетители за день, но восстановить адрес нельзя.
 */
export const pageViews = pgTable(
  'page_views',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    path: text().notNull(),
    section: text().notNull(),
    visitorHash: text().notNull(),
    referrerHost: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.createdAt)],
);
