'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button, type ButtonVariant } from './Button';
import { Dialog } from './Dialog';
import type { ActionState } from './ActionForm';

type ConfirmButtonProps = {
  label: string;
  variant?: ButtonVariant;
  /** Заголовок окна подтверждения: «Удалить запись?». */
  title: string;
  text: ReactNode;
  confirmLabel: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  permalink: string;
  /** Скрытые поля формы — например, id записи. */
  children?: ReactNode;
};

/** Кнопка необратимого действия: сначала окно «Вы уверены?», потом само действие. */
export function ConfirmButton({
  label,
  variant = 'ghost',
  title,
  text,
  confirmLabel,
  action,
  permalink,
  children,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null, permalink);
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <p>{text}</p>
        {state?.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
            {state.error}
          </p>
        ) : null}
        <form action={formAction} className="flex flex-wrap justify-end gap-3">
          {children}
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button type="submit" disabled={pending}>
            {confirmLabel}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
