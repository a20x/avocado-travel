import 'server-only';
import { isAPIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { env } from '@/server/env';
import { takeRateLimit } from '@/server/rate-limit';
import { getClientIp } from '@/server/request';
import { fail, ok, type Result } from '@/shared/lib/result';
import {
  isRole,
  type AuthError,
  type SessionUser,
  type SignInInput,
  type SignUpInput,
} from '../model';
import { auth } from './auth';

/** Попыток входа и регистрации с одного IP: защита от подбора паролей и массовой регистрации. */
const SIGN_IN_LIMIT = { limit: 10, windowMs: 60_000 };
const SIGN_UP_LIMIT = { limit: 10, windowMs: 10 * 60_000 };

async function withinLimit(action: string, rule: { limit: number; windowMs: number }) {
  return env.RATE_LIMIT_DISABLED || takeRateLimit(`${action}:${await getClientIp()}`, rule);
}

/**
 * Кто вошёл, или null. cache — на время одного запроса: шапка и страница спрашивают
 * об этом обе, а проверка нужна одна.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: isRole(role) ? role : 'customer' };
});

/**
 * Вошедший пользователь — или переход на вход с возвратом на `returnTo`.
 * Вызывается в каждой закрытой странице и каждом action: проверка только в интерфейсе защитой не считается.
 */
export async function requireUser(returnTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** Администратор — или 404: посторонним незачем знать, что по этому адресу что-то есть. */
export async function requireAdmin(returnTo = '/admin'): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (user.role !== 'admin') notFound();
  return user;
}

export async function signUp(input: SignUpInput): Promise<Result<null, AuthError>> {
  if (!(await withinLimit('sign-up', SIGN_UP_LIMIT))) {
    return fail('TOO_MANY_REQUESTS');
  }
  try {
    await auth.api.signUpEmail({ body: input, headers: await headers() });
    return ok(null);
  } catch (error) {
    if (isAPIError(error) && String(error.body?.code).startsWith('USER_ALREADY_EXISTS')) {
      return fail('EMAIL_TAKEN');
    }
    throw error;
  }
}

export async function signIn(input: SignInInput): Promise<Result<null, AuthError>> {
  if (!(await withinLimit('sign-in', SIGN_IN_LIMIT))) {
    return fail('TOO_MANY_REQUESTS');
  }
  try {
    await auth.api.signInEmail({ body: input, headers: await headers() });
    return ok(null);
  } catch (error) {
    // Не уточняем, что именно не так — почта или пароль: иначе по ответу можно узнать, кто зарегистрирован.
    if (isAPIError(error) && error.body?.code === 'INVALID_EMAIL_OR_PASSWORD') {
      return fail('INVALID_CREDENTIALS');
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
}
