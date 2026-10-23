'use client';

import { useActionState, useState } from 'react';
import { plural } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/Button';
import { SCORES } from '../model';
import { rateAction, type RatingFormState } from '../server/actions';
import { Star } from './Star';

/**
 * Выбор оценки: пять переключателей-звёзд. Закрашены звёзды до выбранной (или до той,
 * над которой курсор). Без JavaScript работает как обычная форма.
 */
export function RatingForm() {
  const [state, formAction, pending] = useActionState<RatingFormState, FormData>(
    rateAction,
    {},
    '/',
  );
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(0);
  const shown = hovered || selected;

  return (
    <form action={formAction} className="grid gap-3">
      <fieldset>
        <legend className="mb-2 font-semibold">Ваша оценка</legend>
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
          {SCORES.map((score) => (
            <label key={score} className="cursor-pointer" onMouseEnter={() => setHovered(score)}>
              <input
                type="radio"
                name="score"
                value={score}
                checked={selected === score}
                onChange={() => setSelected(score)}
                aria-label={`${score} ${plural(score, ['звезда', 'звезды', 'звёзд'])} из 5`}
                className="peer sr-only"
              />
              <Star
                fill={score <= shown ? 1 : 0}
                className={cn(
                  'size-9 rounded-sm transition-transform hover:scale-110',
                  'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf',
                )}
              />
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? 'Отправляем…' : 'Оценить'}
        </Button>
      </div>
    </form>
  );
}
