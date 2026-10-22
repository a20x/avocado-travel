'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/Textarea';
import { createTopicAction, type ForumFormState } from '../server/actions';

/** Новая тема: заголовок и первое сообщение. */
export function TopicForm() {
  // Адрес в action — для валидного HTML и работы без JavaScript.
  const [state, formAction, pending] = useActionState<ForumFormState, FormData>(
    createTopicAction,
    {},
    '/forum/new',
  );
  const errors = state.fieldErrors ?? {};

  return (
    <Card className="p-4 md:p-6">
      <form action={formAction} noValidate className="grid gap-5">
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
            {state.error}
          </p>
        ) : null}
        <Input
          name="title"
          label="Заголовок"
          maxLength={120}
          hint="О чём хотите поговорить — коротко, до 120 символов."
          defaultValue={state.values?.title}
          error={errors.title}
        />
        <Textarea
          name="body"
          label="Сообщение"
          rows={8}
          maxLength={5000}
          hint="До 5000 символов. Изменить сообщение можно в первые 15 минут."
          defaultValue={state.values?.body}
          error={errors.body}
        />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Создаём…' : 'Создать тему'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
