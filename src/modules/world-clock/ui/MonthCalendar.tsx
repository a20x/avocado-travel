import { cn } from '@/shared/lib/cn';
import { Card } from '@/shared/ui/Card';
import { WEEKDAYS, monthGrid, monthTitle } from '../model';

/** Календарь текущего месяца с отметкой сегодняшнего дня (L1-S09). `today` — `YYYY-MM-DD`. */
export function MonthCalendar({ today }: { today: string }) {
  const month = today.slice(0, 7);
  return (
    <Card className="p-4 md:p-6">
      <table className="w-full table-fixed border-collapse text-center">
        <caption className="mb-3 text-left text-lg font-semibold">{monthTitle(month)}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day, i) => (
              <th
                key={day}
                scope="col"
                className={cn('pb-2 text-sm font-semibold', i >= 5 ? 'text-pit' : 'text-slate')}
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, i) => (
            <tr key={i}>
              {week.map((date, day) =>
                date ? (
                  <td key={date} className="p-0.5">
                    <span
                      aria-current={date === today ? 'date' : undefined}
                      className={cn(
                        'mx-auto flex size-9 items-center justify-center rounded-full tabular-nums',
                        date === today && 'bg-leaf font-semibold text-white',
                        date !== today && day >= 5 && 'text-pit',
                      )}
                    >
                      {Number(date.slice(8))}
                      {date === today ? <span className="sr-only">, сегодня</span> : null}
                    </span>
                  </td>
                ) : (
                  <td key={`empty-${day}`} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
