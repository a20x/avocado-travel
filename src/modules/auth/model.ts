import { z } from 'zod';

/** Роли пользователей (docs/02-product.md). Новая роль — новая строка здесь. */
export const ROLES = ['customer', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

/** Вошедший пользователь — то, что нужно страницам и другим модулям. */
export type SessionUser = { id: string; name: string; email: string; role: Role };

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

const email = z.string().trim().toLowerCase().pipe(z.email('Проверьте адрес почты'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль').max(MAX_PASSWORD_LENGTH),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Имя — от 2 символов').max(60, 'Имя — до 60 символов'),
  email,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Пароль — от ${MIN_PASSWORD_LENGTH} символов`)
    .max(MAX_PASSWORD_LENGTH, `Пароль — до ${MAX_PASSWORD_LENGTH} символов`),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export type AuthError = 'EMAIL_TAKEN' | 'INVALID_CREDENTIALS' | 'TOO_MANY_REQUESTS';

/** Куда вести после входа по умолчанию. */
export const DEFAULT_AFTER_SIGN_IN = '/account';

/**
 * Адрес возврата после входа из параметра `next`. Только внутренний путь сайта:
 * иначе ссылка вида `/login?next=https://злой-сайт` уводила бы вошедшего пользователя наружу.
 */
export function safeReturnPath(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return DEFAULT_AFTER_SIGN_IN;
  // `//site.ru` и `/\site.ru` браузер понимает как адрес другого сайта.
  if (next.startsWith('//') || next.startsWith('/\\')) return DEFAULT_AFTER_SIGN_IN;
  return next;
}
