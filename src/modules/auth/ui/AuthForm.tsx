'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import type { AuthFormState } from '../server/actions';
import { signInAction, signUpAction } from '../server/actions';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  /** Куда вернуться после входа: например, к брони с выбранными местами. */
  next?: string;
};

/**
 * Форма входа или регистрации. Отправляется через Server Action: работает и без JavaScript,
 * а с ним — без перезагрузки страницы и с ошибками прямо у полей.
 */
export function AuthForm({ mode, next }: AuthFormProps) {
  // Третий аргумент — адрес страницы формы: React пишет его в атрибут action, и форма остаётся
  // валидным HTML (пустой action валидатор W3C не пропускает) и работает до загрузки JavaScript.
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    mode === 'sign-in' ? signInAction : signUpAction,
    {},
    mode === 'sign-in' ? '/login' : '/register',
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
          {state.error}
        </p>
      ) : null}

      {mode === 'sign-up' ? (
        <Input
          name="name"
          label="Имя"
          autoComplete="name"
          required
          defaultValue={state.values?.name}
          error={errors.name}
        />
      ) : null}
      <Input
        name="email"
        type="email"
        label="Почта"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={errors.email}
      />
      <Input
        name="password"
        type="password"
        label="Пароль"
        autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
        required
        hint={mode === 'sign-up' ? 'Не меньше 8 символов' : undefined}
        error={errors.password}
      />

      <Button type="submit" disabled={pending} fullWidth>
        {mode === 'sign-in'
          ? pending
            ? 'Входим…'
            : 'Войти'
          : pending
            ? 'Создаём аккаунт…'
            : 'Зарегистрироваться'}
      </Button>
    </form>
  );
}
