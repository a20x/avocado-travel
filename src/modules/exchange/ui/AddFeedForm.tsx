'use client';

// Клиентский компонент: форма показывает ответ сервера — ошибку или сколько новостей добавлено.
import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { INDUSTRY_CATEGORIES, type IndustryCategory } from '../feeds';
import { addFeedAction, type FeedFormState } from '../server/actions';

/** Подключение ленты администратором: адрес, название источника и рубрика новостей. */
export function AddFeedForm() {
  const [state, formAction, pending] = useActionState<FeedFormState, FormData>(
    addFeedAction,
    null,
    '/rss',
  );
  return (
    <form action={formAction} aria-label="Подключить ленту" className="grid gap-4">
      <div className="grid items-end gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Input
          name="url"
          type="url"
          label="Адрес RSS-ленты"
          placeholder="https://example.ru/rss"
          required
          maxLength={500}
        />
        <Input name="name" label="Название источника" required minLength={2} maxLength={80} />
        <Select
          name="category"
          label="Рубрика"
          options={(Object.keys(INDUSTRY_CATEGORIES) as IndustryCategory[])
            .map((key) => ({ value: key, label: INDUSTRY_CATEGORIES[key] }))
            .sort((a, b) => a.label.localeCompare(b.label, 'ru'))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Проверяем ленту…' : 'Подключить ленту'}
        </Button>
        {state?.error ? (
          <p role="alert" className="text-sm text-error">
            {state.error}
          </p>
        ) : null}
        {state?.success ? (
          <p role="status" className="text-sm text-leaf">
            {state.success}
          </p>
        ) : null}
      </div>
    </form>
  );
}
