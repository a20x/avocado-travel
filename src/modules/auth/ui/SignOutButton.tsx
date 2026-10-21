'use client';

import { useActionState } from 'react';
import { buttonClasses, type ButtonVariant } from '@/shared/ui/Button';
import { signOutAction } from '../server/actions';

/**
 * Выход — форма с кнопкой, а не ссылка: выход меняет состояние, его нельзя делать запросом GET.
 * Клиентский компонент — ради адреса в атрибуте action (см. AuthForm).
 */
export function SignOutButton({ variant = 'secondary' }: { variant?: ButtonVariant }) {
  const [, formAction, pending] = useActionState(signOutAction, null, '/');
  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className={buttonClasses({ variant })}>
        Выйти
      </button>
    </form>
  );
}
