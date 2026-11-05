'use client';

import { useActionState } from 'react';
import { dateInZone, timeInZone } from '@/shared/lib/time';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { durationOf, type FlightEditView } from '../edit';
import { updateFlightAction, type FlightScheduleFormState } from '../server/actions';

/**
 * Форма одного рейса: дата и время вылета (местные, аэропорта вылета), время в пути, самолёт
 * и цены. В полях — текущие значения рейса; авиакомпания, маршрут и номер не меняются.
 */
export function FlightEditForm({
  flight,
  aircraft,
  today,
  back,
}: {
  flight: FlightEditView;
  /** Самолёты справочника, по алфавиту. */
  aircraft: SelectOption[];
  /** Сегодня по местному времени аэропорта вылета. */
  today: string;
  /** Куда вернуться после сохранения — страница, с которой пришли на правку. */
  back?: string;
}) {
  const [state, formAction, pending] = useActionState<FlightScheduleFormState, FormData>(
    updateFlightAction,
    {},
    `/admin/flights/${flight.id}/edit`,
  );
  const errors = state.fieldErrors ?? {};
  const current: Record<string, string> = {
    departureDate: dateInZone(flight.departsAt, flight.originTimezone),
    departureTime: timeInZone(flight.departsAt, flight.originTimezone),
    durationMinutes: String(durationOf(flight)),
    aircraftModelId: String(flight.aircraftModelId),
    priceEconomy: String(flight.priceEconomy / 100),
    priceBusiness: String(flight.priceBusiness / 100),
  };
  const value = (field: string) => state.values?.[field] ?? current[field] ?? '';

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
        <input type="hidden" name="id" value={flight.id} />
        {back ? <input type="hidden" name="back" value={back} /> : null}
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
            {state.error}
          </p>
        ) : null}

        <DatePicker
          key={`date-${value('departureDate')}`}
          name="departureDate"
          label="Дата вылета"
          min={today}
          defaultValue={value('departureDate')}
          error={errors.departureDate}
        />
        <Input
          key={`time-${value('departureTime')}`}
          name="departureTime"
          type="time"
          label="Время вылета"
          defaultValue={value('departureTime')}
          hint={`Местное время аэропорта вылета (${flight.originTimezone}).`}
          error={errors.departureTime}
        />
        <Input
          key={`duration-${value('durationMinutes')}`}
          name="durationMinutes"
          inputMode="numeric"
          label="Время в пути, минут"
          defaultValue={value('durationMinutes')}
          error={errors.durationMinutes}
        />
        {/* key: после ошибки форма сбрасывается, а список без пересоздания вернулся бы к первому пункту. */}
        <Select
          key={`aircraft-${value('aircraftModelId')}`}
          name="aircraftModelId"
          label="Самолёт"
          options={aircraft}
          defaultValue={value('aircraftModelId')}
          hint={
            flight.heldSeats > 0
              ? `Продано мест: ${flight.heldSeats} — самолёт не меняется.`
              : undefined
          }
          error={errors.aircraftModelId}
        />
        <Input
          key={`economy-${value('priceEconomy')}`}
          name="priceEconomy"
          inputMode="numeric"
          label="Цена эконома, ₽"
          defaultValue={value('priceEconomy')}
          hint="Купленные билеты остаются по старой цене."
          error={errors.priceEconomy}
        />
        <Input
          key={`business-${value('priceBusiness')}`}
          name="priceBusiness"
          inputMode="numeric"
          label="Цена бизнеса, ₽"
          defaultValue={value('priceBusiness')}
          error={errors.priceBusiness}
        />

        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : 'Сохранить рейс'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
