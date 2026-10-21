'use client';

import { useActionState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export type ActionState = { error?: string } | null;

type ActionFormProps = {
  /** Server Action вида `(state, formData) => Promise<{ error? } | null>`. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /**
   * Адрес страницы формы. React пишет его в атрибут action: форма остаётся валидным HTML
   * (пустой action валидатор не пропускает) и работает до загрузки JavaScript.
   */
  permalink: string;
  children: ReactNode;
  className?: string;
};

/** Небольшая форма-действие (кнопка «Скрыть», «Удалить», «Добавить») с выводом ошибки. */
export function ActionForm({ action, permalink, children, className }: ActionFormProps) {
  const [state, formAction] = useActionState(action, null, permalink);
  return (
    <form action={formAction} className={cn('contents', className)}>
      {children}
      {state?.error ? (
        <p role="alert" className="w-full text-sm text-error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
