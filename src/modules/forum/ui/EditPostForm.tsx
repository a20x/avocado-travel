'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, buttonClasses } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Textarea';
import { editPostAction, type ForumFormState } from '../server/actions';

type EditPostFormProps = {
  topicId: string;
  postId: string;
  body: string;
  /** Адрес страницы темы без режима правки — туда ведёт «Отмена». */
  backHref: string;
  permalink: string;
};

/** Правка своего сообщения прямо на месте. */
export function EditPostForm({ topicId, postId, body, backHref, permalink }: EditPostFormProps) {
  const [state, formAction, pending] = useActionState<ForumFormState, FormData>(
    editPostAction,
    {},
    permalink,
  );

  return (
    <form action={formAction} noValidate className="grid gap-3">
      {state.error ? (
        <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
          {state.error}
        </p>
      ) : null}
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="postId" value={postId} />
      <Textarea
        name="body"
        label="Текст сообщения"
        rows={6}
        maxLength={5000}
        defaultValue={state.values?.body ?? body}
        error={state.fieldErrors?.body}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Link href={backHref} className={buttonClasses({ variant: 'secondary' })}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
