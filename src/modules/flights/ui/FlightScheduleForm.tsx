'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { MAX_SCHEDULE_DAYS, TURNAROUND_MINUTES, WEEKDAYS } from '../schedule';
import { createFlightsAction, type FlightScheduleFormState } from '../server/actions';

type FlightScheduleFormProps = {
  /** Списки — из справочников в базе, по алфавиту. */
  airlines: SelectOption[];
  airports: SelectOption[];
  aircraft: SelectOption[];
  /** Сегодня по Москве: раньше рейсы не заводятся. */
  today: string;
};

/**
 * Форма «Добавить рейсы»: ежедневный рейс в одно время по выбранным дням недели периода,
 * по желанию — с обратным рейсом. Пустые время в пути и цены считаются по расстоянию.
 */
export function FlightScheduleForm({
  airlines,
  airports,
  aircraft,
  today,
}: FlightScheduleFormProps) {
  const [state, formAction, pending] = useActionState<FlightScheduleFormState, FormData>(
    createFlightsAction,
    {},
    '/admin/flights/new',
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: string, initial = '') => state.values?.[field] ?? initial;
  const weekdays = state.values
    ? value('weekdays').split(',')
    : ['1', '2', '3', '4', '5', '6', '7'];
  const withReturn = state.values ? state.values.withReturn === 'on' : true;
  const choose = (label: string) => [{ value: '', label }];

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
            {state.error}
          </p>
        ) : null}

        <p className="text-slate md:col-span-2">
          Нужного города или авиакомпании нет в списке?{' '}
          <Link href="/admin/cities/new">Добавить город</Link> ·{' '}
          <Link href="/admin/airlines/new">Добавить авиакомпанию</Link>
        </p>

        {/* key: после ошибки форма сбрасывается, а список без пересоздания вернулся бы к первому пункту. */}
        <Select
          key={`airline-${value('airline')}`}
          name="airline"
          label="Авиакомпания"
          options={[...choose('Выберите авиакомпанию'), ...airlines]}
          defaultValue={value('airline')}
          error={errors.airline}
        />
        <Select
          key={`aircraft-${value('aircraftModelId')}`}
          name="aircraftModelId"
          label="Самолёт"
          options={[...choose('Выберите самолёт'), ...aircraft]}
          defaultValue={value('aircraftModelId')}
          error={errors.aircraftModelId}
        />
        <Select
          key={`origin-${value('origin')}`}
          name="origin"
          label="Откуда"
          options={[...choose('Выберите аэропорт'), ...airports]}
          defaultValue={value('origin')}
          error={errors.origin}
        />
        <Select
          key={`destination-${value('destination')}`}
          name="destination"
          label="Куда"
          options={[...choose('Выберите аэропорт'), ...airports]}
          defaultValue={value('destination')}
          error={errors.destination}
        />

        <DatePicker
          name="dateFrom"
          label="Первый день"
          min={today}
          defaultValue={value('dateFrom', today)}
          error={errors.dateFrom}
        />
        <DatePicker
          name="dateTo"
          label="Последний день"
          min={today}
          defaultValue={value('dateTo')}
          hint={`Включительно. Не больше ${MAX_SCHEDULE_DAYS} дней за раз.`}
          error={errors.dateTo}
        />

        <fieldset className="grid gap-2 md:col-span-2">
          <legend className="font-medium">Дни недели</legend>
          <div className="flex flex-wrap gap-4">
            {WEEKDAYS.map((label, index) => {
              const day = String(index + 1);
              return (
                <label key={day} className="flex items-center gap-2">
                  <input
                    key={`weekday-${day}-${weekdays.includes(day)}`}
                    type="checkbox"
                    name="weekdays"
                    value={day}
                    defaultChecked={weekdays.includes(day)}
                    className="size-5 accent-leaf"
                  />
                  {label}
                </label>
              );
            })}
          </div>
          {errors.weekdays ? <p className="text-sm text-error">{errors.weekdays}</p> : null}
        </fieldset>

        <Input
          name="departureTime"
          type="time"
          label="Время вылета"
          defaultValue={value('departureTime', '10:00')}
          hint="Местное время аэропорта вылета."
          error={errors.departureTime}
        />
        <Input
          name="durationMinutes"
          inputMode="numeric"
          label="Время в пути, минут"
          defaultValue={value('durationMinutes')}
          hint="Пусто — посчитается по расстоянию."
          error={errors.durationMinutes}
        />
        <Input
          name="priceEconomy"
          inputMode="numeric"
          label="Цена эконома, ₽"
          defaultValue={value('priceEconomy')}
          hint="Пусто — посчитается по расстоянию."
          error={errors.priceEconomy}
        />
        <Input
          name="priceBusiness"
          inputMode="numeric"
          label="Цена бизнеса, ₽"
          defaultValue={value('priceBusiness')}
          hint="Пусто — в 2,7 раза дороже эконома."
          error={errors.priceBusiness}
        />

        <label className="flex items-center gap-3 md:col-span-2">
          <input
            key={`return-${withReturn}`}
            type="checkbox"
            name="withReturn"
            defaultChecked={withReturn}
            className="size-5 accent-leaf"
          />
          Создать и обратные рейсы — через {TURNAROUND_MINUTES} минут после прилёта
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Создаём рейсы…' : 'Создать рейсы'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
