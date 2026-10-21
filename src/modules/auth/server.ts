/**
 * Серверный вход модуля auth: проверка сессии и роли, обработчик маршрута Better Auth (ADR-0008).
 */
import 'server-only';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from './server/auth';

export { getCurrentUser, requireAdmin, requireUser } from './server/service';

/** Обработчик для `src/app/api/auth/[...all]/route.ts`: служебные запросы Better Auth. */
export const authHandler = toNextJsHandler(auth);
