'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { safeReturnPath, signInSchema, signUpSchema, type AuthError } from '../model';
import * as service from './service';

/** Состояние формы после отправки: общая ошибка, ошибки полей и введённое — чтобы не набирать заново. */
export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'name' | 'email' | 'password', string>>;
  values?: { name?: string; email?: string };
};

const MESSAGES: Record<AuthError, string> = {
  EMAIL_TAKEN: 'С этой почтой уже есть аккаунт. Войдите или укажите другую почту.',
  INVALID_CREDENTIALS: 'Неверная почта или пароль.',
  TOO_MANY_REQUESTS: 'Слишком много попыток. Подождите немного и попробуйте снова.',
};

const FIELDS = ['name', 'email', 'password'] as const;
type Field = (typeof FIELDS)[number];

/** Первая ошибка каждого поля — её и покажем под полем. */
function fieldErrors(error: z.ZodError): AuthFormState['fieldErrors'] {
  const result: Partial<Record<Field, string>> = {};
  for (const issue of error.issues) {
    const field = FIELDS.find((name) => name === issue.path[0]);
    if (field && !result[field]) result[field] = issue.message;
  }
  return result;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '');

export async function signInAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: text(formData, 'email') };
  const parsed = signInSchema.safeParse({ ...values, password: text(formData, 'password') });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const result = await service.signIn(parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };

  redirect(safeReturnPath(formData.get('next')));
}

export async function signUpAction(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { name: text(formData, 'name'), email: text(formData, 'email') };
  const parsed = signUpSchema.safeParse({ ...values, password: text(formData, 'password') });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const result = await service.signUp(parsed.data);
  if (!result.ok) return { error: MESSAGES[result.error], values };

  redirect(safeReturnPath(formData.get('next')));
}

export async function signOutAction(): Promise<null> {
  await service.signOut();
  redirect('/');
}
