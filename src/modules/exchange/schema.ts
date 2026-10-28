import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Внешние RSS-ленты «Новостей отрасли» (L4-05, docs/04-data-model.md). Подключает и удаляет
 * их администратор на вкладке «RSS»; первые три добавляет миграция. `id` — короткий код,
 * он сохраняется в новости как `news.external_feed`.
 */
export const externalFeeds = pgTable(
  'external_feeds',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    url: text().notNull().unique(),
    /** Рубрика импортированных новостей: aviation или travel (INDUSTRY_CATEGORIES). */
    category: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Последняя попытка импорта и её итог: ошибка (null — удачно) и сколько новостей добавлено. */
    checkedAt: timestamp({ withTimezone: true }),
    lastError: text(),
    lastAdded: integer().notNull().default(0),
  },
  (table) => [check('external_feeds_category', sql`${table.category} in ('aviation', 'travel')`)],
);
