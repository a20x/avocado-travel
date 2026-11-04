'use client';

import { useActionState } from 'react';
import { formatPrice } from '@/shared/lib/format';
import { timeInZone } from '@/shared/lib/time';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { adminRouteHref, durationOf, type FlightEditView, type RouteRef } from '../edit';
import { updateRouteAction, type FlightScheduleFormState } from '../server/actions';

/**
 * Форма маршрута: заполненные поля меняются у всех предстоящих рейсов, пустые — остаются.
 * Подсказки «Сейчас: …» — значения ближайшего рейса.
 */
export function RouteEditForm({
  route,
  sample,
  aircraft,
}: {
  route: RouteRef;
  /** Ближайший предстоящий рейс — для подсказок о текущих значениях. */
  sample: FlightEditView;
  aircraft: SelectOption[];
}) {
  const [state, formAction, pending] = useActionState<FlightScheduleFormState, FormData>(
    updateRouteAction,
    {},
    adminRouteHref(route, {}, '/admin/flights/route/edit'),
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: string) => state.values?.[field] ?? '';
  const now = (text: string) => `Сейчас у ближайшего рейса: ${text}. Пусто — не менять.`;

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
        <input type="hidden" name="airline" value={route.airline} />
        <input type="hidden" name="origin" value={route.origin} />
        <input type="hidden" name="destination" value={route.destination} />
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
            {state.error}
          </p>
        ) : null}

        {/* key: после ошибки форма сбрасывается, а список без пересоздания вернулся бы к первому пункту. */}
        <Select
          key={`aircraft-${value('aircraftModelId')}`}
          name="aircraftModelId"
          label="Самолёт"
          options={[{ value: '', label: 'Не менять' }, ...aircraft]}
          defaultValue={value('aircraftModelId')}
          hint={now(sample.aircraft)}
          error={errors.aircraftModelId}
        />
        <Input
          name="departureTime"
          type="time"
          label="Время вылета"
          defaultValue={value('departureTime')}
          hint={now(`${timeInZone(sample.departsAt, sample.originTimezone)}, местное`)}
          error={errors.departureTime}
        />
        <Input
          name="durationMinutes"
          inputMode="numeric"
          label="Время в пути, минут"
          defaultValue={value('durationMinutes')}
          hint={now(`${durationOf(sample)} мин`)}
          error={errors.durationMinutes}
        />
        <Input
          name="priceEconomy"
          inputMode="numeric"
          label="Цена эконома, ₽"
          defaultValue={value('priceEconomy')}
          hint={now(formatPrice(sample.priceEconomy))}
          error={errors.priceEconomy}
        />
        <Input
          name="priceBusiness"
          inputMode="numeric"
          label="Цена бизнеса, ₽"
          defaultValue={value('priceBusiness')}
          hint={now(formatPrice(sample.priceBusiness))}
          error={errors.priceBusiness}
        />

        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Изменить все предстоящие рейсы'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
