import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const searchKind = pgEnum('search_kind', ['page', 'news', 'forum']);

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

/**
 * Поисковый индекс (docs/04-data-model.md, «Поиск по сайту»). `tsv` PostgreSQL считает сам
 * из заголовка (вес A — важнее) и текста (вес B) с русской морфологией; «ё» приравнена к «е».
 */
export const searchDocuments = pgTable(
  'search_documents',
  {
    id: serial().primaryKey(),
    kind: searchKind().notNull(),
    /** Что это в своём модуле: id новости, id темы форума, ключ страницы. */
    refId: text().notNull(),
    url: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    /** С какого момента документ ищется (новость с будущей датой); null — сразу. */
    visibleFrom: timestamp({ withTimezone: true }),
    tsv: tsvector()
      .notNull()
      .generatedAlwaysAs(
        sql`setweight(to_tsvector('russian', translate("title", 'Ёё', 'Ее')), 'A') || setweight(to_tsvector('russian', translate("body", 'Ёё', 'Ее')), 'B')`,
      ),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique().on(table.kind, table.refId),
    index('search_documents_tsv_index').using('gin', table.tsv),
  ],
);
