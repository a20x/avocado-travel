'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { NEWS_CATEGORIES, type NewsInput } from '../model';
import { saveNewsAction, type NewsFormState } from '../server/actions';

type NewsFormProps = {
  /** Есть — правка этой новости, нет — новая. */
  id?: string;
  initial: NewsInput;
};

// Выпадающие списки сайта — по алфавиту.
const CATEGORY_OPTIONS = Object.entries(NEWS_CATEGORIES)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

/** Форма новости в админке: создание и правка. */
export function NewsForm({ id, initial }: NewsFormProps) {
  // Адрес в action — для валидного HTML и работы без JavaScript (см. AuthForm).
  const [state, formAction, pending] = useActionState<NewsFormState, FormData>(
    saveNewsAction,
    {},
    id ? `/admin/news/${id}/edit` : '/admin/news/new',
  );
  const errors = state.fieldErrors ?? {};
  const value = (field: keyof NewsInput) => state.values?.[field] ?? initial[field];

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
        <Input
          name="slug"
          label="Адрес"
          defaultValue={value('slug')}
          hint="Латиница, цифры и дефисы: /news/адрес. Пусто — соберётся из заголовка."
          error={errors.slug}
        />
        <Select
          name="category"
          label="Рубрика"
          options={CATEGORY_OPTIONS}
          defaultValue={value('category')}
          error={errors.category}
        />
        <DatePicker
          name="publishedDate"
          label="Дата публикации"
          defaultValue={value('publishedDate')}
          hint="По Москве. Новость с будущей датой появится на сайте в этот день."
          error={errors.publishedDate}
        />
        <Input
          name="publishedTime"
          type="time"
          label="Время публикации"
          defaultValue={value('publishedTime')}
          error={errors.publishedTime}
        />
        <Textarea
          name="summary"
          label="Кратко"
          rows={3}
          defaultValue={value('summary')}
          hint="Одно-два предложения для ленты новостей."
          error={errors.summary}
          className="md:col-span-2"
        />
        <Textarea
          name="body"
          label="Текст"
          rows={14}
          defaultValue={value('body')}
          hint="Абзацы разделяйте пустой строкой."
          error={errors.body}
          className="md:col-span-2"
        />
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Сохраняем…' : id ? 'Сохранить изменения' : 'Опубликовать'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
