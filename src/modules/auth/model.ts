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

/**
 * Страница «Только для администратора»: сюда ведёт закрытая страница админки, если вошёл
 * обычный пользователь. Раньше он получал 404 и не понимал, что нужно войти под другим аккаунтом.
 */
export const ACCESS_DENIED_PATH = '/access-denied';

/** Адрес страницы «Только для администратора» с возвратом на `returnTo` после входа. */
export function accessDeniedHref(returnTo: string): string {
  return `${ACCESS_DENIED_PATH}?next=${encodeURIComponent(returnTo)}`;
}

/** Куда вести покупателя после входа по умолчанию. */
export const DEFAULT_AFTER_SIGN_IN = '/account';

/** Раздел пользователя: администратору — админка, покупателю — личный кабинет. */
export function homeFor(role: Role): string {
  return role === 'admin' ? '/admin' : DEFAULT_AFTER_SIGN_IN;
}

/**
 * Адрес возврата из параметра `next` — или null, если его нет или он не годится. Только
 * внутренний путь сайта: иначе ссылка вида `/login?next=https://злой-сайт` уводила бы
 * вошедшего пользователя наружу.
 */
export function explicitReturnPath(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/')) return null;
  // `//site.ru` и `/\site.ru` браузер понимает как адрес другого сайта.
  if (next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/** Адрес возврата после входа: явный `next` или кабинет покупателя. */
export function safeReturnPath(next: unknown): string {
  return explicitReturnPath(next) ?? DEFAULT_AFTER_SIGN_IN;
}

/**
 * Куда вести после входа: туда, откуда пришёл (`next`), а без него — в раздел пользователя.
 * Администратор сразу попадает в админку, а не в личный кабинет.
 */
export function afterSignIn(next: unknown, role: Role): string {
  return explicitReturnPath(next) ?? homeFor(role);
}
