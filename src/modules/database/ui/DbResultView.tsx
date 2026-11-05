import { ChartData } from '@/modules/analytics/ui';
import { flightEditHref } from '@/modules/flights';
import Link from 'next/link';
import { formatDate, formatPrice, plural } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Pagination } from '@/shared/ui/Pagination';
import { Table } from '@/shared/ui/Table';
import { DB_REPORTS, dbHref, scheduleTotal, share, type DbQuery, type DbResult } from '../model';
import { MonthLine, ValueBars } from './charts';

const number = new Intl.NumberFormat('ru-RU');
const pct = (value: number) => `${value.toLocaleString('ru-RU')}%`;
const departure = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});
const monthLabel = (month: string) => {
  const [year, value] = month.split('-');
  return `${value}.${year}`;
};

function Empty() {
  return (
    <EmptyState
      image="/images/illustrations/no-results.svg"
      title="Ничего не нашлось"
      text="Ослабьте условия: очистите часть полей или расширьте период."
    />
  );
}

/**
 * Сводка продаж пуста: в выбранные дни продаж не было (даты внутри периода продаж, но,
 * например, в этот день у авиакомпании не купили ни одного билета). Вместо «Ничего не нашлось» —
 * ссылка на весь период с продажами: пустой страницы преподаватель не увидит.
 */
function NoSales({
  query,
  period,
}: {
  query: DbQuery;
  period: { first: string; last: string } | null;
}) {
  return (
    <EmptyState
      image="/images/illustrations/no-results.svg"
      title="В эти дни продаж не было"
      text={
        period
          ? `Продажи есть с ${formatDate(period.first, { year: true })} по ${formatDate(period.last, { year: true })}.`
          : 'Продаж пока нет.'
      }
      action={
        period ? (
          <Link href={dbHref({ ...query, dateFrom: undefined, dateTo: undefined })}>
            Показать весь период с продажами
          </Link>
        ) : undefined
      }
    />
  );
}

/** В выбранные даты рейсов нет — ссылки на ближайшие дни, когда по тем же условиям летаем. */
function NearestDates({ query, dates }: { query: DbQuery; dates: string[] }) {
  return (
    <EmptyState
      image="/images/illustrations/no-results.svg"
      title="В эти даты рейсов нет"
      text="По выбранным городам и авиакомпании рейсы есть в другие дни."
      action={
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          <span>Ближайшие рейсы:</span>
          {dates.map((date) => (
            <Link
              key={date}
              href={dbHref({ ...query, report: 'flights', dateFrom: date, dateTo: date })}
            >
              {formatDate(date, { year: true })}
            </Link>
          ))}
        </p>
      }
    />
  );
}

/** Сколько записей вернул запрос и когда — строка над результатом. */
function Summary({ count, fetchedAt }: { count: number; fetchedAt: Date }) {
  return (
    <p role="status" className="text-sm text-slate">
      Найдено записей: <strong className="text-graphite">{number.format(count)}</strong>. Получено{' '}
      {departure.format(fetchedAt)} МСК.
    </p>
  );
}

/** Рейсы одной страницы — таблица и переход по страницам; у обоих поисков рейсов она одна. */
function FlightsTable({
  query,
  result,
  editableAfter,
}: {
  query: DbQuery;
  result: Extract<DbResult, { report: 'airline' | 'flights' }>;
  /** Администратору — «Изменить» у рейсов, которые вылетают позже этого момента. */
  editableAfter?: Date;
}) {
  // Правка рейса вернёт на эту же страницу результатов.
  const back = dbHref(query, result.page);
  return (
    <>
      {editableAfter ? (
        <p className="text-sm text-slate">
          «Изменить» есть только у рейсов, которые ещё не вылетели: улетевший рейс не меняется.
        </p>
      ) : null}
      <Table caption={`Рейсы, страница ${result.page} из ${result.totalPages}`}>
        <thead>
          <tr>
            <th scope="col">Вылет, МСК</th>
            <th scope="col">Рейс</th>
            <th scope="col">Маршрут</th>
            <th scope="col">Авиакомпания</th>
            <th scope="col">Самолёт</th>
            <th scope="col">Эконом</th>
            <th scope="col">Бизнес</th>
            <th scope="col">Продано</th>
            {editableAfter ? (
              <th scope="col">
                <span className="sr-only">Правка</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap tabular-nums">{departure.format(row.departsAt)}</td>
              <td className="whitespace-nowrap">{row.number}</td>
              <td>
                {row.origin} → {row.destination}
              </td>
              <td>{row.airline}</td>
              <td>{row.aircraft}</td>
              <td className="whitespace-nowrap tabular-nums">{formatPrice(row.priceEconomy)}</td>
              <td className="whitespace-nowrap tabular-nums">{formatPrice(row.priceBusiness)}</td>
              <td className="tabular-nums">{number.format(row.sold)}</td>
              {editableAfter ? (
                <td>
                  {row.departsAt > editableAfter ? (
                    <Link href={flightEditHref(row.id, back)}>
                      Изменить<span className="sr-only"> рейс {row.number}</span>
                    </Link>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        href={(page) => dbHref(query, page)}
      />
    </>
  );
}

/** Результат выбранного запроса: таблица, а у сводок — ещё график и точные значения. */
export function DbResultView({
  query,
  result,
  fetchedAt,
  isAdmin = false,
}: {
  query: DbQuery;
  result: DbResult;
  fetchedAt: Date;
  /** Администратору — ссылка «Изменить» у предстоящих рейсов (правка в админке). */
  isAdmin?: boolean;
}) {
  return (
    <Card
      as="section"
      aria-labelledby="result-title"
      className="grid content-start gap-4 p-5 md:p-6"
    >
      <h2 id="result-title" className="text-xl">
        Результат запроса: {DB_REPORTS[result.report]}
      </h2>
      <ResultBody query={query} result={result} fetchedAt={fetchedAt} isAdmin={isAdmin} />
    </Card>
  );
}

function ResultBody({
  query,
  result,
  fetchedAt,
  isAdmin,
}: {
  query: DbQuery;
  result: DbResult;
  fetchedAt: Date;
  isAdmin: boolean;
}) {
  const editableAfter = isAdmin ? fetchedAt : undefined;
  switch (result.report) {
    case 'airline':
      return (
        <>
          <Summary count={result.total} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <Empty />
          ) : (
            <FlightsTable query={query} result={result} editableAfter={editableAfter} />
          )}
        </>
      );

    case 'flights':
      return (
        <>
          <Summary count={result.total} fetchedAt={fetchedAt} />
          {result.rows.length === 0 && result.nearestDates.length > 0 ? (
            <NearestDates query={query} dates={result.nearestDates} />
          ) : result.rows.length === 0 ? (
            <Empty />
          ) : (
            <>
              <FlightsTable query={query} result={result} editableAfter={editableAfter} />
            </>
          )}
        </>
      );

    case 'routes':
      return (
        <>
          <Summary count={result.rows.length} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <Empty />
          ) : (
            <Table caption="Маршруты: рейсы, цены эконома и проданные места">
              <thead>
                <tr>
                  <th scope="col">Маршрут</th>
                  <th scope="col">Рейсов</th>
                  <th scope="col">Мин. цена</th>
                  <th scope="col">Средняя</th>
                  <th scope="col">Макс. цена</th>
                  <th scope="col">Продано мест</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={`${row.origin}-${row.destination}`}>
                    <td>
                      {row.origin} → {row.destination}
                    </td>
                    <td className="tabular-nums">{number.format(row.flights)}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatPrice(row.minPrice)}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatPrice(row.avgPrice)}</td>
                    <td className="whitespace-nowrap tabular-nums">{formatPrice(row.maxPrice)}</td>
                    <td className="tabular-nums">{number.format(row.sold)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      );

    case 'countryCity':
    case 'partZone':
      return (
        <>
          <Summary count={result.rows.length} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <Empty />
          ) : (
            <Table caption="Города по выбранным условиям">
              <thead>
                <tr>
                  <th scope="col">Город</th>
                  <th scope="col">Страна</th>
                  <th scope="col">Часть света</th>
                  <th scope="col">Аэропорты</th>
                  <th scope="col">Часовой пояс</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.city}>
                    <td>{row.city}</td>
                    <td>{row.country}</td>
                    <td>{row.part}</td>
                    <td>{row.airports}</td>
                    <td>{row.zones}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      );

    case 'countryAirline':
    case 'typeAirline':
      return (
        <>
          <Summary count={result.rows.length} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <Empty />
          ) : (
            <Table caption="Авиакомпании по выбранным условиям">
              <thead>
                <tr>
                  <th scope="col">Авиакомпания</th>
                  <th scope="col">Код</th>
                  <th scope="col">Страна</th>
                  <th scope="col">Тип</th>
                  <th scope="col">Базовый город</th>
                  <th scope="col">Багаж в экономе</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.code}>
                    <td>{row.airline}</td>
                    <td>{row.code}</td>
                    <td>{row.country}</td>
                    <td>{row.type}</td>
                    <td>{row.baseCity}</td>
                    <td>{row.baggageIncluded ? 'Включён' : 'Не включён'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      );

    case 'schedule': {
      const total = scheduleTotal(result.rows);
      const price = (value: number, flights: number) => (flights > 0 ? formatPrice(value) : '—');
      return (
        <>
          <Summary count={result.rows.length} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <Empty />
          ) : (
            <>
              <h3 className="text-lg">Число рейсов по авиакомпаниям</h3>
              <ValueBars
                data={result.rows.map((row) => ({ label: row.airline, value: row.flights }))}
                unit="count"
                name="Рейсов"
              />
              <Table caption="Точные значения: рейсы по авиакомпаниям">
                <thead>
                  <tr>
                    <th scope="col">Авиакомпания</th>
                    <th scope="col">Рейсов</th>
                    <th scope="col">Предстоящих</th>
                    <th scope="col">Маршрутов</th>
                    <th scope="col">Мин. цена</th>
                    <th scope="col">Средняя цена</th>
                    <th scope="col">Макс. цена</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.airline}>
                      <td>{row.airline}</td>
                      <td className="tabular-nums">{number.format(row.flights)}</td>
                      <td className="tabular-nums">{number.format(row.upcoming)}</td>
                      <td className="tabular-nums">{number.format(row.routes)}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {price(row.minPrice, row.flights)}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {price(row.avgPrice, row.flights)}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {price(row.maxPrice, row.flights)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-semibold">
                  <tr>
                    <td>Итого</td>
                    <td className="tabular-nums">{number.format(total.flights)}</td>
                    <td className="tabular-nums">{number.format(total.upcoming)}</td>
                    <td className="tabular-nums">{number.format(total.routes)}</td>
                    <td className="whitespace-nowrap tabular-nums">
                      {price(total.minPrice, total.flights)}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {price(total.avgPrice, total.flights)}
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {price(total.maxPrice, total.flights)}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </>
          )}
        </>
      );
    }

    case 'airlines': {
      const revenue = result.rows.reduce((sum, row) => sum + row.revenue, 0);
      return (
        <>
          <Summary count={result.rows.length} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <NoSales query={query} period={result.period} />
          ) : (
            <>
              <h3 className="text-lg">Выручка по авиакомпаниям</h3>
              <ValueBars
                data={result.rows.map((row) => ({ label: row.airline, value: row.revenue }))}
                unit="rub"
                name="Выручка"
              />
              <Table caption="Точные значения: продажи по авиакомпаниям">
                <thead>
                  <tr>
                    <th scope="col">Авиакомпания</th>
                    <th scope="col">Заказов</th>
                    <th scope="col">Билетов</th>
                    <th scope="col">Выручка</th>
                    <th scope="col">Доля</th>
                    <th scope="col">Средняя цена</th>
                    <th scope="col">Макс. цена</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.airline}>
                      <td>{row.airline}</td>
                      <td className="tabular-nums">{number.format(row.orders)}</td>
                      <td className="tabular-nums">{number.format(row.tickets)}</td>
                      <td className="whitespace-nowrap tabular-nums">{formatPrice(row.revenue)}</td>
                      <td className="tabular-nums">{pct(share(row.revenue, revenue))}</td>
                      <td className="whitespace-nowrap tabular-nums">
                        {formatPrice(row.averagePrice)}
                      </td>
                      <td className="whitespace-nowrap tabular-nums">
                        {formatPrice(row.maxPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </>
      );
    }

    case 'months': {
      const tickets = result.rows.reduce((sum, row) => sum + row.tickets, 0);
      return (
        <>
          <Summary count={result.rows.length} fetchedAt={fetchedAt} />
          {result.rows.length === 0 ? (
            <NoSales query={query} period={result.period} />
          ) : (
            <>
              <h3 className="text-lg">Выручка по месяцам</h3>
              <MonthLine
                data={result.rows.map((row) => ({
                  label: monthLabel(row.month),
                  value: row.revenue,
                }))}
                unit="rub"
                name="Выручка"
              />
              <p className="text-sm text-slate">
                По горизонтали — месяцы оформления заказа, по вертикали — выручка.
              </p>
              <Table caption="Точные значения: продажи по месяцам">
                <thead>
                  <tr>
                    <th scope="col">Месяц</th>
                    <th scope="col">Заказов</th>
                    <th scope="col">Билетов</th>
                    <th scope="col">Доля билетов</th>
                    <th scope="col">Выручка</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.month}>
                      <td className="tabular-nums">{monthLabel(row.month)}</td>
                      <td className="tabular-nums">{number.format(row.orders)}</td>
                      <td className="tabular-nums">{number.format(row.tickets)}</td>
                      <td className="tabular-nums">{pct(share(row.tickets, tickets))}</td>
                      <td className="whitespace-nowrap tabular-nums">{formatPrice(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </>
      );
    }

    case 'ratings': {
      const { summary } = result;
      return (
        <>
          <Summary count={summary.total} fetchedAt={fetchedAt} />
          <dl className="grid grid-cols-3 gap-4">
            {(
              [
                ['Средняя оценка', `${summary.average.toLocaleString('ru-RU')} / 5`],
                ['Минимальная', String(summary.min)],
                ['Максимальная', String(summary.max)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="grid gap-1">
                <dt className="text-sm text-slate">{label}</dt>
                <dd className="text-2xl font-semibold text-leaf tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="text-lg">Сколько раз поставили каждую оценку</h3>
          <ValueBars
            data={result.rows.map((row) => ({ label: `${row.score} / 5`, value: row.count }))}
            unit="count"
            name="Оценок"
          />
          <ChartData
            caption="Распределение оценок сайта"
            head={['Оценка', 'Количество', 'Доля']}
            rows={result.rows.map((row) => [
              `${row.score} / 5`,
              number.format(row.count),
              pct(share(row.count, summary.total)),
            ])}
          />
          <p className="text-sm text-slate">
            Всего {number.format(summary.total)}{' '}
            {plural(summary.total, ['оценка', 'оценки', 'оценок'])}. Поставить оценку можно на
            главной странице.
          </p>
        </>
      );
    }
  }
}
