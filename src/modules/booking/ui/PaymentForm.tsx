'use client';

import { useActionState } from 'react';
import { formatPrice } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { payOrderAction, type FormState } from '../server/actions';

/**
 * Демо-оплата (docs/02-product.md): форма карты с проверкой формата и алгоритмом Луна.
 * Деньги не списываются, данные карты не сохраняются.
 */
export function PaymentForm({ orderId, total }: { orderId: string; total: number }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    payOrderAction,
    {},
    `/booking/${orderId}`,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <Card as="section" aria-labelledby="payment-title" className="grid gap-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="payment-title" className="text-xl">
          Оплата картой
        </h2>
        <Badge tone="warning">Демонстрационная оплата</Badge>
      </div>
      <p className="text-sm text-slate">
        Деньги не списываются, данные карты нигде не сохраняются. Для проверки подойдёт номер 4242
        4242 4242 4242, любой будущий срок и любой CVC.
      </p>
      {state.error ? (
        <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
          {state.error}
        </p>
      ) : null}

      <form action={formAction} noValidate className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="order" value={orderId} />
        <Input
          name="number"
          label="Номер карты"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          maxLength={23}
          required
          error={errors.number}
          className="sm:col-span-2"
        />
        <Input
          name="expiry"
          label="Срок действия"
          autoComplete="cc-exp"
          placeholder="ММ/ГГ"
          maxLength={5}
          required
          error={errors.expiry}
        />
        <Input
          name="cvc"
          label="CVC"
          inputMode="numeric"
          autoComplete="cc-csc"
          placeholder="123"
          maxLength={3}
          required
          error={errors.cvc}
        />
        <Button type="submit" disabled={pending} fullWidth className="sm:col-span-2">
          {pending ? 'Проводим оплату…' : `Оплатить ${formatPrice(total)}`}
        </Button>
      </form>
    </Card>
  );
}
