'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { postEntryAction, type EntryFormState } from '../server/actions';

/** Форма новой записи: писать может любой посетитель, без входа. */
export function GuestbookForm() {
  // Адрес в action — для валидного HTML и работы без JavaScript.
  const [state, formAction, pending] = useActionState<EntryFormState, FormData>(
    postEntryAction,
    {},
    '/guestbook',
  );
  const errors = state.fieldErrors ?? {};

  return (
    <Card as="section" aria-labelledby="guestbook-form-title" className="grid gap-4 p-4 md:p-6">
      <h2 id="guestbook-form-title" className="text-xl">
        Оставить запись
      </h2>
      {state.error ? (
        <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
          {state.error}
        </p>
      ) : null}
      <form action={formAction} noValidate className="grid gap-4">
        <Input
          name="authorName"
          label="Ваше имя"
          autoComplete="name"
          maxLength={50}
          defaultValue={state.values?.authorName}
          error={errors.authorName}
        />
        <Textarea
          name="message"
          label="Сообщение"
          rows={5}
          maxLength={2000}
          hint="До 2000 символов. Записи с грубыми словами публикуются только после проверки."
          defaultValue={state.values?.message}
          error={errors.message}
        />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Отправляем…' : 'Отправить'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
