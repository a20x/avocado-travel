import { formatDate } from '@/shared/lib/format';
import { dateInZone, timeInZone } from '@/shared/lib/time';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { Table } from '@/shared/ui/Table';
import { SECTION_LABELS, isSearchEngine, type StatsReport, type Totals } from '../model';

const number = (value: number) => value.toLocaleString('ru-RU');

function SummaryCard({ title, totals }: { title: string; totals: Totals }) {
  return (
    <Card as="section" aria-label={title} className="grid gap-3 p-5">
      <h2 className="text-lg">{title}</h2>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-slate">Просмотры</dt>
          <dd className="text-2xl font-semibold tabular-nums">{number(totals.views)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate">Посетители</dt>
          <dd className="text-2xl font-semibold tabular-nums">{number(totals.visitors)}</dd>
        </div>
      </dl>
    </Card>
  );
}

/**
 * Отчёт о посещениях (L1-S01): итоги, по дням, по разделам, источники переходов и журнал.
 * Посетитель — уникальный хэш IP за день, поэтому посетители за период — сумма по дням.
 */
export function StatsReportView({ report }: { report: StatsReport }) {
  const maxViews = Math.max(1, ...report.byDay.map((day) => day.views));
  const periodLabel = `${formatDate(report.period.from)} — ${formatDate(report.period.to)}`;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard title="Сегодня" totals={report.today} />
        <SummaryCard title="За период" totals={report.inPeriod} />
        <SummaryCard title="За всё время" totals={report.allTime} />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Table caption={`По дням: ${periodLabel}`}>
          <thead>
            <tr>
              <th scope="col">Дата</th>
              <th scope="col">Просмотры</th>
              <th scope="col">Посетители</th>
            </tr>
          </thead>
          <tbody>
            {report.byDay.toReversed().map((day) => (
              <tr key={day.date}>
                <td className="whitespace-nowrap">{formatDate(day.date)}</td>
                <td className="min-w-40">
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-right tabular-nums">{number(day.views)}</span>
                    <span
                      aria-hidden="true"
                      className="h-2 rounded-full bg-leaf"
                      style={{ width: `${(day.views / maxViews) * 100}%`, maxWidth: '8rem' }}
                    />
                  </div>
                </td>
                <td className="tabular-nums">{number(day.visitors)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="grid gap-6">
          <Table caption="По разделам сайта">
            <thead>
              <tr>
                <th scope="col">Раздел</th>
                <th scope="col">Просмотры</th>
                <th scope="col">Посетители</th>
                <th scope="col">Доля</th>
              </tr>
            </thead>
            <tbody>
              {report.bySection.map((row) => (
                <tr key={row.section}>
                  <td>{SECTION_LABELS[row.section] ?? SECTION_LABELS.other}</td>
                  <td className="tabular-nums">{number(row.views)}</td>
                  <td className="tabular-nums">{number(row.visitors)}</td>
                  <td className="tabular-nums">
                    {Math.round((row.views / Math.max(1, report.inPeriod.views)) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Table caption="Источники переходов">
            <thead>
              <tr>
                <th scope="col">Сайт</th>
                <th scope="col">Переходы</th>
              </tr>
            </thead>
            <tbody>
              {report.referrers.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-slate">
                    Переходов с других сайтов за период не было.
                  </td>
                </tr>
              ) : (
                report.referrers.map((row) => (
                  <tr key={row.host}>
                    <td>
                      <span className="mr-2">{row.host}</span>
                      {isSearchEngine(row.host) ? <Badge tone="accent">поисковик</Badge> : null}
                    </td>
                    <td className="tabular-nums">{number(row.views)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      <Table caption="Последние просмотры за период">
        <thead>
          <tr>
            <th scope="col">Время</th>
            <th scope="col">Страница</th>
            <th scope="col">Откуда</th>
          </tr>
        </thead>
        <tbody>
          {report.recent.map((view, i) => (
            <tr key={i}>
              <td className="whitespace-nowrap">
                {formatDate(dateInZone(view.createdAt, 'Europe/Moscow'))},{' '}
                {timeInZone(view.createdAt, 'Europe/Moscow')}
              </td>
              <td className="break-all">{view.path}</td>
              <td>{view.referrerHost ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
