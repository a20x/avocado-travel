import Link from 'next/link';
import { formatDate } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import type { SearchError } from '../model';

type Problem = SearchError | 'NO_FLIGHTS' | 'NO_MATCHES';

const TEXTS: Record<Problem, { title: string; text: string }> = {
  INVALID_QUERY: {
    title: 'Не получилось разобрать запрос',
    text: 'Выберите города, дату и число пассажиров в поиске на главной.',
  },
  SAME_CITY: {
    title: 'Город вылета и прилёта совпадают',
    text: 'Выберите другой город прилёта.',
  },
  UNKNOWN_CITY: {
    title: 'В этот город мы пока не летаем',
    text: 'Список городов — в разделе «Направления».',
  },
  DATE_OUT_OF_RANGE: {
    title: 'На эту дату билеты не продаются',
    text: 'Билеты продаются на даты от сегодняшней до 60 дней вперёд.',
  },
  NO_FLIGHTS: {
    title: 'На эту дату рейсов нет',
    text: 'Попробуйте соседнюю дату или другой класс: возможно, на все места уже нет билетов.',
  },
  NO_MATCHES: {
    title: 'Под фильтры ничего не подходит',
    text: 'Снимите часть отметок в фильтрах — рейсы на эту дату есть.',
  },
};

/** Почему список рейсов пуст и что сделать дальше. */
export function SearchProblem({
  problem,
  editHref,
  nearest = [],
}: {
  problem: Problem;
  editHref: string;
  /** На эту дату рейсов нет — ссылки на ближайшие даты, когда по направлению летаем. */
  nearest?: Array<{ date: string; href: string }>;
}) {
  const { title, text } = TEXTS[problem];
  return (
    <EmptyState
      image="/images/illustrations/no-results.svg"
      title={title}
      text={nearest.length > 0 ? 'По этому направлению рейсы есть в другие дни.' : text}
      action={
        problem === 'NO_MATCHES' ? null : (
          <div className="grid justify-items-center gap-4">
            {nearest.length > 0 ? (
              <p className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                <span>Ближайшие рейсы:</span>
                {nearest.map((item) => (
                  <Link key={item.date} href={item.href}>
                    {formatDate(item.date, { weekday: true })}
                  </Link>
                ))}
              </p>
            ) : null}
            <Link href={editHref} className={buttonClasses({ variant: 'secondary' })}>
              Изменить запрос
            </Link>
          </div>
        )
      }
    />
  );
}
