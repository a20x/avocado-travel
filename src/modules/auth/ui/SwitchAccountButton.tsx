'use client';

import { useActionState } from 'react';
import { buttonClasses } from '@/shared/ui/Button';
import { ACCESS_DENIED_PATH } from '../model';
import { switchAccountAction } from '../server/actions';

/**
 * «Выйти и войти как администратор»: выход и сразу страница входа с возвратом на `next`.
 * Форма, а не ссылка: выход меняет состояние. Клиентский компонент — ради адреса в action.
 */
export function SwitchAccountButton({ next }: { next: string }) {
  const [, formAction, pending] = useActionState(switchAccountAction, null, ACCESS_DENIED_PATH);
  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" disabled={pending} className={buttonClasses({ fullWidth: true })}>
        Выйти и войти как администратор
      </button>
    </form>
  );
}
