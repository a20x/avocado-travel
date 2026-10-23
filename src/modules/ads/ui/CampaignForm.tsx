'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { AD_IMAGES, PLACEMENTS } from '../model';
import { saveCampaignAction, type CampaignFormState } from '../server/actions';

export type CampaignFormValues = {
  title: string;
  text: string;
  image: string;
  targetUrl: string;
  placement: string;
  startDate: string;
  endDate: string;
  isEnabled: boolean;
};

const IMAGE_OPTIONS = Object.entries(AD_IMAGES).map(([value, label]) => ({ value, label }));
const PLACEMENT_OPTIONS = Object.entries(PLACEMENTS).map(([value, label]) => ({ value, label }));

/** Форма кампании в админке: создание и правка. */
export function CampaignForm({ id, initial }: { id?: number; initial: CampaignFormValues }) {
  const [state, formAction, pending] = useActionState<CampaignFormState, FormData>(
    saveCampaignAction,
    {},
    id ? `/admin/ads/${id}/edit` : '/admin/ads/new',
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: Exclude<keyof CampaignFormValues, 'isEnabled'>) =>
    state.values?.[field] ?? initial[field];
  const enabled = state.values ? state.values.isEnabled === 'on' : initial.isEnabled;

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5 md:grid-cols-2">
        {id ? <input type="hidden" name="id" value={id} /> : null}
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error md:col-span-2">
            {state.error}
          </p>
        ) : null}
        <Input
          name="title"
          label="Заголовок"
          defaultValue={value('title')}
          error={errors.title}
          className="md:col-span-2"
        />
        <Textarea
          name="text"
          label="Текст"
          rows={3}
          hint="Одно-два предложения, до 200 символов."
          defaultValue={value('text')}
          error={errors.text}
          className="md:col-span-2"
        />
        {/* key: после ошибки форма сбрасывается, а список без пересоздания вернулся бы к первому пункту. */}
        <Select
          key={`image-${value('image')}`}
          name="image"
          label="Картинка"
          options={IMAGE_OPTIONS}
          defaultValue={value('image')}
          error={errors.image}
        />
        <Select
          key={`placement-${value('placement')}`}
          name="placement"
          label="Где показывать"
          options={PLACEMENT_OPTIONS}
          defaultValue={value('placement')}
          error={errors.placement}
        />
        <Input
          name="targetUrl"
          label="Ссылка"
          hint="Адрес https://… или страница сайта, например /destinations/sochi."
          defaultValue={value('targetUrl')}
          error={errors.targetUrl}
          className="md:col-span-2"
        />
        <DatePicker
          name="startDate"
          label="Начало показа"
          defaultValue={value('startDate')}
          error={errors.startDate}
        />
        <DatePicker
          name="endDate"
          label="Окончание показа"
          hint="Включительно, по Москве."
          defaultValue={value('endDate')}
          error={errors.endDate}
        />
        <label className="flex items-center gap-3 md:col-span-2">
          <input
            key={`enabled-${enabled}`}
            type="checkbox"
            name="isEnabled"
            defaultChecked={enabled}
            className="size-5 accent-leaf"
          />
          Включена — показывается в свой период
        </label>
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : id ? 'Сохранить изменения' : 'Создать кампанию'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
