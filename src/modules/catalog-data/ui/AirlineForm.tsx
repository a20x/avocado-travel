'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { saveAirlineAction, type ReferenceFormState } from '../server/actions';

export type AirlineFormValues = {
  code: string;
  name: string;
  color: string;
  description: string;
  baggageIncluded: boolean;
};

/** Форма авиакомпании в админке: создание и правка. Код после создания не меняется. */
export function AirlineForm({ code, initial }: { code?: string; initial: AirlineFormValues }) {
  const [state, formAction, pending] = useActionState<ReferenceFormState, FormData>(
    saveAirlineAction,
    {},
    code ? `/admin/airlines/${code}/edit` : '/admin/airlines/new',
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: Exclude<keyof AirlineFormValues, 'baggageIncluded'>) =>
    state.values?.[field] ?? initial[field];
  const baggage = state.values ? state.values.baggageIncluded === 'on' : initial.baggageIncluded;

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
        {code ? <input type="hidden" name="currentCode" value={code} /> : null}
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
            {state.error}
          </p>
        ) : null}

        <Input
          name="name"
          label="Название"
          defaultValue={value('name')}
          hint="Выдуманное: настоящие авиакомпании на сайте не используются."
          error={errors.name}
        />
        {code ? (
          <Input
            name="code"
            label="Код"
            value={code}
            readOnly
            hint="Входит в номера рейсов, поэтому не меняется."
          />
        ) : (
          <Input
            name="code"
            label="Код"
            defaultValue={value('code')}
            maxLength={3}
            hint="Три латинские буквы, например NRD. Из него собираются номера рейсов: NRD 100."
            error={errors.code}
          />
        )}
        <Input
          name="color"
          type="color"
          label="Фирменный цвет"
          defaultValue={value('color')}
          error={errors.color}
        />
        <Textarea
          name="description"
          label="Описание"
          rows={3}
          defaultValue={value('description')}
          hint="Одно-два предложения для страницы авиакомпаний."
          error={errors.description}
          className="md:col-span-2"
        />
        <label className="flex items-center gap-3 md:col-span-2">
          <input
            key={`baggage-${baggage}`}
            type="checkbox"
            name="baggageIncluded"
            defaultChecked={baggage}
            className="size-5 accent-leaf"
          />
          Багаж включён в эконом
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : code ? 'Сохранить изменения' : 'Добавить авиакомпанию'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
