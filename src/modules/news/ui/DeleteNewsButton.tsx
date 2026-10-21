'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { deleteNewsAction, type NewsFormState } from '../server/actions';

/** Удаление новости с подтверждением: удалённую не вернуть. */
export function DeleteNewsButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<NewsFormState, FormData>(
    deleteNewsAction,
    {},
    '/admin/news',
  );

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        Удалить
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Удалить новость?">
        <p>«{title}» исчезнет с сайта. Вернуть её не получится — только написать заново.</p>
        {state.error ? (
          <p role="alert" className="rounded-sm bg-error-bg px-4 py-3 text-error">
            {state.error}
          </p>
        ) : null}
        <form action={formAction} className="flex flex-wrap justify-end gap-3">
          <input type="hidden" name="id" value={id} />
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Не удалять
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Удаляем…' : 'Удалить'}
          </Button>
        </form>
      </Dialog>
    </>
  );
}
