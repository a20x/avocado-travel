/**
 * Модуль auth: пользователи, вход, регистрация и роли (обёртка над Better Auth, ADR-0005).
 * Общий вход: можно импортировать откуда угодно. Проверка сессии — в `@/modules/auth/server`,
 * формы — в `@/modules/auth/ui` (ADR-0008).
 */

/** Таблицы публикуются для внешних ключей (заказ → пользователь) и чтения в чужих репозиториях (ADR-0007). */
export { accounts, sessions, users, verifications } from './schema';

export {
  DEFAULT_AFTER_SIGN_IN,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  ROLES,
  isRole,
  safeReturnPath,
  signInSchema,
  signUpSchema,
} from './model';
export type { AuthError, Role, SessionUser, SignInInput, SignUpInput } from './model';
