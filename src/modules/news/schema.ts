import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const newsSource = pgEnum('news_source', ['site', 'external']);

/**
 * Новости (docs/04-data-model.md): свои, которые пишет администратор, и импортированные
 * из лент отрасли (T-32). Текст — обычный, абзацы разделены пустой строкой.
 */
export const news = pgTable(
  'news',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    summary: text().notNull(),
    body: text().notNull(),
    category: text().notNull(),
    source: newsSource().notNull().default('site'),
    /** Для импортированных: оригинал и лента. Уникальность — защита от повторного импорта. */
    externalUrl: text().unique(),
    externalFeed: text(),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    /** Новость с датой в будущем посетители не видят, пока она не наступит. */
    publishedAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.source, table.publishedAt)],
);
