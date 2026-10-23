import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/** Опросы (docs/04-data-model.md). На сайте показывается активный опрос. */
export const polls = pgTable('polls', {
  id: serial().primaryKey(),
  question: text().notNull(),
  isActive: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable(
  'poll_options',
  {
    id: serial().primaryKey(),
    pollId: integer()
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    text: text().notNull(),
    position: integer().notNull(),
  },
  (table) => [index().on(table.pollId, table.position)],
);

/**
 * Голоса. Один голос на посетителя: уникальная пара «опрос + ключ голосующего» —
 * второй голос база не примет даже при одновременных запросах.
 */
export const pollVotes = pgTable(
  'poll_votes',
  {
    id: serial().primaryKey(),
    pollId: integer()
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    optionId: integer()
      .notNull()
      .references(() => pollOptions.id, { onDelete: 'cascade' }),
    /** `user:<id>` для вошедшего пользователя, `ip:<хэш>` для гостя. */
    voterKey: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.pollId, table.voterKey), index().on(table.optionId)],
);
