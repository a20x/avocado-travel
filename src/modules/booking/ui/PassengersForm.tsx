'use client';

import { useActionState } from 'react';
import type { CabinClass } from '@/modules/catalog-data';
import { formatPrice } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import type { PricedSeat } from '../model';
import { createOrderAction, type FormState } from '../server/actions';

type PassengersFormProps = {
  flightId: string;
  cabinClass: CabinClass;
  seats: PricedSeat[];
  total: number;
};

/** Данные пассажиров — по одному на каждое выбранное место — и итог брони. */
export function PassengersForm({ flightId, cabinClass, seats, total }: PassengersFormProps) {
  // Адрес в action — чтобы форма была валидным HTML и работала до загрузки JavaScript (см. AuthForm).
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createOrderAction,
    {},
    '/booking',
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      noValidate
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <input type="hidden" name="flight" value={flightId} />
      <input type="hidden" name="cabinClass" value={cabinClass} />
      {seats.map((seat) => (
        <input key={seat.seat} type="hidden" name="seats" value={seat.seat} />
      ))}

      <Card as="section" aria-labelledby="passengers-title" className="grid gap-5 p-4 md:p-6">
        <h2 id="passengers-title" className="text-xl">
          Пассажиры
        </h2>
        {/* docs/02-product.md, «Персональные данные». */}
        <p className="rounded-sm bg-warning-bg px-4 py-3 text-sm text-warning">
          Это учебный проект: не вводите настоящие паспортные данные. Хватит имени и фамилии — можно
          выдуманных.
        </p>
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
            {state.error}
          </p>
        ) : null}

        {seats.map((seat, i) => (
          <fieldset key={seat.seat} className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <legend className="float-left mb-1 w-full font-semibold sm:col-span-2">
              Пассажир {i + 1} · место {seat.seat}
            </legend>
            <Input
              name={`passenger-${i}-firstName`}
              label="Имя"
              autoComplete="off"
              required
              defaultValue={state.values?.[`passenger-${i}-firstName`]}
              error={errors[`passengers.${i}.firstName`]}
            />
            <Input
              name={`passenger-${i}-lastName`}
              label="Фамилия"
              autoComplete="off"
              required
              defaultValue={state.values?.[`passenger-${i}-lastName`]}
              error={errors[`passengers.${i}.lastName`]}
            />
          </fieldset>
        ))}
      </Card>

      <Card as="aside" aria-label="Итог брони" className="grid gap-4 p-4 md:p-6 lg:sticky lg:top-4">
        <h2 className="text-lg">Итог</h2>
        <ul className="grid gap-2">
          {seats.map((seat) => (
            <li key={seat.seat} className="flex justify-between gap-3">
              <span>
                Место {seat.seat}
                {seat.extraLegroom ? (
                  <span className="block text-sm text-slate">больше места для ног</span>
                ) : null}
              </span>
              <span className="whitespace-nowrap">{formatPrice(seat.price)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-line pt-4 text-xl font-semibold">
          <span>Итого</span>
          <span>{formatPrice(total)}</span>
        </p>
        <Button type="submit" disabled={pending} fullWidth>
          {pending ? 'Оформляем…' : 'Перейти к оплате'}
        </Button>
        <p className="text-sm text-slate">После перехода места держатся за вами 15 минут.</p>
      </Card>
    </form>
  );
}
