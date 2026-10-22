import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '@/modules/auth';

/**
 * Темы форума (docs/04-data-model.md). Число сообщений и время последнего хранятся в теме,
 * чтобы список тем не пересчитывал сообщения при каждом открытии.
 */
export const forumTopics = pgTable(
  'forum_topics',
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    authorId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastPostAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    postsCount: integer().notNull().default(0),
  },
  (table) => [index().on(table.lastPostAt)],
);

/** Сообщения тем. Первое сообщение темы — её текст. */
export const forumPosts = pgTable(
  'forum_posts',
  {
    id: uuid().primaryKey().defaultRandom(),
    topicId: uuid()
      .notNull()
      .references(() => forumTopics.id, { onDelete: 'cascade' }),
    authorId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** null — сообщение не изменяли. */
    updatedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index().on(table.topicId, table.createdAt)],
);
