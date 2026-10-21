import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { db } from '@/server/db';
import { env } from '@/server/env';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../model';
import { accounts, sessions, users, verifications } from '../schema';

/**
 * Настройка Better Auth (ADR-0005). Снаружи модуля её никто не видит:
 * страницы и другие модули пользуются функциями из `server.ts`.
 */
export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_SITE_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
    // Подтверждение почты не используется (ADR-0005): после регистрации сразу вход.
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // input: false — роль нельзя передать при регистрации, иначе любой назначил бы себя админом.
      role: { type: 'string', required: false, defaultValue: 'customer', input: false },
    },
  },
  session: {
    // Сессия проверяется на каждой странице (шапка показывает, кто вошёл). Подписанная копия
    // в cookie на 5 минут избавляет от запроса к базе при каждом переходе.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // nextCookies — последним: он передаёт cookie сессии из Server Actions в ответ браузеру.
  plugins: [nextCookies()],
});
