'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import type { ReferenceLists, ReferenceReturn } from '../model';
import { saveCityAction, type ReferenceFormState } from '../server/actions';
import { ReferenceValueSelect } from './ReferenceSelect';

export type CityFormValues = {
  name: string;
  nameFrom: string;
  nameTo: string;
  country: string;
  worldPart: string;
  description: string;
  /** Поля аэропорта — только у нового города. */
  iata: string;
  airportName: string;
  lat: string;
  lon: string;
  timezone: string;
};

/** Пустая форма нового города. */
export const NEW_CITY_VALUES: CityFormValues = {
  name: '',
  nameFrom: '',
  nameTo: '',
  country: 'Россия',
  worldPart: '',
  description: '',
  iata: '',
  airportName: '',
  lat: '',
  lon: '',
  timezone: 'Europe/Moscow',
};

type CityFormProps = {
  /** Есть — правка этого города, нет — новый город с аэропортом. */
  slug?: string;
  initial: CityFormValues;
  /** Значения выпадающих списков из базы, по алфавиту. */
  lists: ReferenceLists;
  /** Форму открыли кнопкой «Добавить» из формы рейсов: после сохранения — обратно туда. */
  returnTo?: ReferenceReturn;
  /** Откуда пришли: туда форма вернёт после сохранения. */
  back?: string;
  /** Форма в окне кнопки «Добавить» в форме авиакомпании: сохранение без перехода на другую страницу. */
  inline?: { onSaved: (option: SelectOption) => void; onCancel: () => void };
};

/** Форма города в админке: создание (вместе с первым аэропортом) и правка. */
export function CityForm({ slug, initial, lists, returnTo, back, inline }: CityFormProps) {
  const [state, formAction, pending] = useActionState<ReferenceFormState, FormData>(
    inline
      ? async (previous, formData) => {
          const next = await saveCityAction(previous, formData);
          if (next.saved) inline.onSaved(next.saved);
          return next;
        }
      : saveCityAction,
    {},
    slug ? `/admin/cities/${slug}/edit` : '/admin/cities/new',
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: keyof CityFormValues) => state.values?.[field] ?? initial[field];
  // В окне поверх формы авиакомпании её поля уже есть на странице: у этих другой id.
  const idPrefix = inline ? 'city-' : '';

  const form = (
    <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
      {slug ? <input type="hidden" name="slug" value={slug} /> : null}
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {back ? <input type="hidden" name="back" value={back} /> : null}
      {inline ? <input type="hidden" name="inline" value="1" /> : null}
      {state.error ? (
        <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
          {state.error}
        </p>
      ) : null}

      <Input
        name="name"
        label="Название города"
        idPrefix={idPrefix}
        defaultValue={value('name')}
        hint={slug ? undefined : 'Например, Мурманск. Адрес страницы соберётся из названия.'}
        error={errors.name}
        className="md:col-span-2"
      />
      <ReferenceValueSelect
        kind="country"
        name="country"
        idPrefix={idPrefix}
        values={lists.country}
        defaultValue={value('country')}
        error={errors.country}
      />
      {/* Части света — закрытый список, пополнять нечем. key: см. Select — выбор после ошибки. */}
      <Select
        key={`worldPart-${value('worldPart')}`}
        name="worldPart"
        label="Часть света"
        idPrefix={idPrefix}
        options={[
          { value: '', label: 'Выберите часть света' },
          ...lists.world_part.map((part) => ({ value: part, label: part })),
        ]}
        defaultValue={value('worldPart')}
        error={errors.worldPart}
      />
      <Input
        name="nameFrom"
        label="Откуда: «из …»"
        idPrefix={idPrefix}
        defaultValue={value('nameFrom')}
        hint="Для поиска фразой: «из Мурманска»."
        error={errors.nameFrom}
      />
      <Input
        name="nameTo"
        label="Куда: «в …»"
        idPrefix={idPrefix}
        defaultValue={value('nameTo')}
        hint="Для поиска фразой: «в Мурманск»."
        error={errors.nameTo}
      />
      <Textarea
        name="description"
        label="Описание"
        idPrefix={idPrefix}
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
            idPrefix={idPrefix}
            defaultValue={value('iata')}
            maxLength={3}
            hint="Три латинские буквы, например MMK."
            error={errors.iata}
          />
          <Input
            name="airportName"
            label="Название аэропорта"
            idPrefix={idPrefix}
            defaultValue={value('airportName')}
            error={errors.airportName}
          />
          <Input
            name="lat"
            label="Широта"
            idPrefix={idPrefix}
            inputMode="decimal"
            defaultValue={value('lat')}
            hint="Для погоды и карты: 68.78"
            error={errors.lat}
          />
          <Input
            name="lon"
            label="Долгота"
            idPrefix={idPrefix}
            inputMode="decimal"
            defaultValue={value('lon')}
            hint="32.75"
            error={errors.lon}
          />
          <ReferenceValueSelect
            kind="timezone"
            name="timezone"
            idPrefix={idPrefix}
            values={lists.timezone}
            defaultValue={value('timezone')}
            hint="Время вылета рейсов задаётся по местному времени аэропорта."
            error={errors.timezone}
          />
        </fieldset>
      )}

      <div className="flex flex-wrap gap-2 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : slug ? 'Сохранить изменения' : 'Добавить город'}
        </Button>
        {inline ? (
          <Button type="button" variant="secondary" onClick={inline.onCancel}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );

  return inline ? form : <Card className="p-4 md:p-6">{form}</Card>;
}
