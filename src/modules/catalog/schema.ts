import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
} from 'drizzle-orm/pg-core';

/**
 * Разделы каталога ресурсов (docs/04-data-model.md): дерево через parent_id.
 * Удаление раздела удаляет его подразделы и ссылки.
 */
export const catalogSections = pgTable(
  'catalog_sections',
  {
    id: serial().primaryKey(),
    /** null — раздел верхнего уровня. */
    parentId: integer().references((): AnyPgColumn => catalogSections.id, {
      onDelete: 'cascade',
    }),
    title: text().notNull(),
    position: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
  },
  (table) => [index().on(table.parentId, table.position)],
);

export const catalogLinks = pgTable(
  'catalog_links',
  {
    id: serial().primaryKey(),
    sectionId: integer()
      .notNull()
      .references(() => catalogSections.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    url: text().notNull(),
    description: text().notNull().default(''),
    position: integer().notNull().default(0),
    isVisible: boolean().notNull().default(true),
  },
  (table) => [index().on(table.sectionId, table.position)],
);
