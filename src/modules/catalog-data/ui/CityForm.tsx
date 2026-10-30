'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { saveCityAction, type ReferenceFormState } from '../server/actions';

export type CityFormValues = {
  name: string;
  nameFrom: string;
  nameTo: string;
  country: string;
  description: string;
  /** Поля аэропорта — только у нового города. */
  iata: string;
  airportName: string;
  lat: string;
  lon: string;
  timezone: string;
};

type CityFormProps = {
  /** Есть — правка этого города, нет — новый город с аэропортом. */
  slug?: string;
  initial: CityFormValues;
  /** Часовые пояса для списка, по алфавиту, — нужны только новому городу. */
  timezones?: SelectOption[];
};

/** Форма города в админке: создание (вместе с первым аэропортом) и правка. */
export function CityForm({ slug, initial, timezones = [] }: CityFormProps) {
  const [state, formAction, pending] = useActionState<ReferenceFormState, FormData>(
    saveCityAction,
    {},
    slug ? `/admin/cities/${slug}/edit` : '/admin/cities/new',
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: keyof CityFormValues) => state.values?.[field] ?? initial[field];

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
        {slug ? <input type="hidden" name="slug" value={slug} /> : null}
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
            {state.error}
          </p>
        ) : null}

        <Input
          name="name"
          label="Название города"
          defaultValue={value('name')}
          hint={slug ? undefined : 'Например, Мурманск. Адрес страницы соберётся из названия.'}
          error={errors.name}
        />
        <Input
          name="country"
          label="Страна"
          defaultValue={value('country')}
          error={errors.country}
        />
        <Input
          name="nameFrom"
          label="Откуда: «из …»"
          defaultValue={value('nameFrom')}
          hint="Для поиска фразой: «из Мурманска»."
          error={errors.nameFrom}
        />
        <Input
          name="nameTo"
          label="Куда: «в …»"
          defaultValue={value('nameTo')}
          hint="Для поиска фразой: «в Мурманск»."
          error={errors.nameTo}
        />
        <Textarea
          name="description"
          label="Описание"
          rows={4}
          defaultValue={value('description')}
          hint="Необязательно. Показывается на странице направления."
          error={errors.description}
          className="md:col-span-2"
        />

        {slug ? null : (
          <fieldset className="grid gap-5 md:col-span-2 md:grid-cols-2">
            <legend className="mb-2 text-lg font-semibold">Аэропорт города</legend>
            <Input
              name="iata"
              label="Код аэропорта"
              defaultValue={value('iata')}
              maxLength={3}
              hint="Три латинские буквы, например MMK."
              error={errors.iata}
            />
            <Input
              name="airportName"
              label="Название аэропорта"
              defaultValue={value('airportName')}
              error={errors.airportName}
            />
            <Input
              name="lat"
              label="Широта"
              inputMode="decimal"
              defaultValue={value('lat')}
              hint="Для погоды и карты: 68.78"
              error={errors.lat}
            />
            <Input
              name="lon"
              label="Долгота"
              inputMode="decimal"
              defaultValue={value('lon')}
              hint="32.75"
              error={errors.lon}
            />
            {/* key: после ошибки форма сбрасывается, а список без пересоздания вернулся бы к первому пункту. */}
            <Select
              key={`timezone-${value('timezone')}`}
              name="timezone"
              label="Часовой пояс"
              options={timezones}
              defaultValue={value('timezone')}
              hint="Время вылета рейсов задаётся по местному времени аэропорта."
              error={errors.timezone}
            />
          </fieldset>
        )}

        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : slug ? 'Сохранить изменения' : 'Добавить город'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
