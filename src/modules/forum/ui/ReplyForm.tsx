'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Textarea } from '@/shared/ui/Textarea';
import { replyAction, type ForumFormState } from '../server/actions';

/** Ответ в теме — для вошедших пользователей. */
export function ReplyForm({ topicId, permalink }: { topicId: string; permalink: string }) {
  const [state, formAction, pending] = useActionState<ForumFormState, FormData>(
    replyAction,
    {},
    permalink,
  );

  return (
    <Card as="section" aria-labelledby="reply-title" className="grid gap-4 p-4 md:p-6">
      <h2 id="reply-title" className="text-xl">
        Ваш ответ
      </h2>
      {state.error ? (
        <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
          {state.error}
        </p>
      ) : null}
      <form action={formAction} noValidate className="grid gap-4">
        <input type="hidden" name="topicId" value={topicId} />
        <Textarea
          name="body"
          label="Сообщение"
          rows={5}
          maxLength={5000}
          hint="До 5000 символов. Изменить сообщение можно в первые 15 минут."
          defaultValue={state.values?.body}
          error={state.fieldErrors?.body}
        />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Отправляем…' : 'Ответить'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
