'use client';

import { useActionState } from 'react';
import { Button } from '@/shared/ui/Button';
import { voteAction, type VoteFormState } from '../server/actions';

type PollFormProps = {
  pollId: number;
  question: string;
  /** Только тексты: число голосов до голосования в браузер не отправляется. */
  options: Array<{ id: number; text: string }>;
};

/** Варианты ответа — обычные переключатели: форма работает и без JavaScript. */
export function PollForm({ pollId, question, options }: PollFormProps) {
  const [state, formAction, pending] = useActionState<VoteFormState, FormData>(voteAction, {}, '/');

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="pollId" value={pollId} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">{question}</legend>
        {options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-sm border border-line px-4 py-3 hover:border-graphite has-checked:border-leaf has-checked:bg-sage-light"
          >
            <input type="radio" name="optionId" value={option.id} className="size-4 accent-leaf" />
            {option.text}
          </label>
        ))}
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Отправляем…' : 'Голосовать'}
        </Button>
      </div>
    </form>
  );
}
