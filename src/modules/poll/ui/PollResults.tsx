import { plural } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/Badge';
import type { PollView } from '../model';

/** Результаты опроса — горизонтальная диаграмма (L1-S10). Свой выбор отмечен. */
export function PollResults({ poll }: { poll: PollView }) {
  return (
    <div className="grid gap-4">
      <p className="font-semibold">{poll.question}</p>
      <ul className="grid gap-3">
        {poll.options.map((option) => {
          const mine = option.id === poll.myOptionId;
          return (
            <li key={option.id} className="grid gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span>
                  {option.text} {mine ? <Badge tone="success">ваш выбор</Badge> : null}
                </span>
                <span className="tabular-nums">
                  <b>{option.percent}%</b>{' '}
                  <span className="text-sm text-slate">({option.votes})</span>
                </span>
              </div>
              <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-mist">
                <div
                  className={cn('h-full rounded-full', mine ? 'bg-leaf' : 'bg-avocado')}
                  style={{ width: `${option.percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-slate">
        Всего {poll.totalVotes} {plural(poll.totalVotes, ['голос', 'голоса', 'голосов'])}. Спасибо
        за ответ!
      </p>
    </div>
  );
}
