'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { cancelOrderAction, type FormState } from '../server/actions';

type CancelOrderButtonProps = {
  orderId: string;
  pnr: string;
  isPaid: boolean;
};

/** «Отменить бронь» с подтверждением: отмену не вернуть, поэтому сначала спрашиваем. */
export function CancelOrderButton({ orderId, pnr, isPaid }: CancelOrderButtonProps) {
  const [open, setOpen] = useState(false);
  // Адрес в action — для валидного HTML (см. AuthForm).
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    cancelOrderAction,
    {},
    '/account',
  );

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Отменить бронь
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Отменить бронь ${pnr}?`}>
        <p>
          Места освободятся, и их смогут купить другие.
          {isPaid ? ' Оплата демонстрационная, поэтому деньги возвращать не нужно.' : null}
        </p>
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
            {state.error}
          </p>
        ) : null}
        <form action={formAction} className="flex flex-wrap justify-end gap-3">
          <input type="hidden" name="order" value={orderId} />
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Не отменять
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Отменяем…' : 'Отменить бронь'}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
