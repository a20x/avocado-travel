import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Таблицы Better Auth (docs/04-data-model.md). Поля — те, что ожидает библиотека;
 * от себя добавлено только `role`. Время — timestamptz, как во всём проекте.
 */

const createdAt = timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp({ withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  /** customer — покупатель, admin — администратор (src/modules/auth/model.ts). */
  role: text().notNull().default('customer'),
  createdAt,
  updatedAt,
});

/** Сессии: в cookie браузера лежит только подписанный токен, сама сессия — здесь. */
export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt,
    updatedAt,
  },
  (table) => [index().on(table.userId)],
);

/** Способы входа пользователя. Для входа по почте — запись `credential` с хэшем пароля. */
export const accounts = pgTable(
  'accounts',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    /** Хэш пароля (scrypt), сам пароль нигде не хранится. */
    password: text(),
    createdAt,
    updatedAt,
  },
  (table) => [index().on(table.userId)],
);

/** Одноразовые коды Better Auth (сброс пароля и т. п.). Пока не используются, но нужны библиотеке. */
export const verifications = pgTable(
  'verifications',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index().on(table.identifier)],
);
