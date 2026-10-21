import {
  boolean,
  index,
  inet,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const hiddenReason = pgEnum('guestbook_hidden_reason', ['stop_word', 'admin']);

/** Записи гостевой книги (docs/04-data-model.md). IP хранится открыто — он нужен для бана. */
export const guestbookEntries = pgTable(
  'guestbook_entries',
  {
    id: uuid().primaryKey().defaultRandom(),
    authorName: text().notNull(),
    message: text().notNull(),
    /** null — адрес определить не удалось. */
    ip: inet(),
    userAgent: text(),
    isVisible: boolean().notNull().default(true),
    /** Почему скрыта: запрещённое слово или решение администратора. */
    hiddenReason: hiddenReason(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index().on(table.isVisible, table.createdAt)],
);

/** Запрещённые слова и выражения — в нижнем регистре. */
export const guestbookStopWords = pgTable('guestbook_stop_words', {
  id: serial().primaryKey(),
  word: text().notNull().unique(),
});

/** Запрещённые хосты: один IP (`203.0.113.7`) или подсеть (`203.0.113.0/24`). */
export const guestbookBannedHosts = pgTable('guestbook_banned_hosts', {
  id: serial().primaryKey(),
  pattern: inet().notNull().unique(),
  comment: text().notNull().default(''),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
