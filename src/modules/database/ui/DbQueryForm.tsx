import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { FLIGHT_SORTS, type DbQuery, type FlightSort, type RoutePair } from '../model';
import { RouteSelects } from './RouteSelects';

/** Что делает каждый запрос — подпись над формой. */
const DESCRIPTIONS: Record<DbQuery['report'], string> = {
  flights:
    'Рейсы с условиями по городам, авиакомпании и дате вылета, по 20 на страницу. «Продано» — места, занятые действующими билетами.',
  routes:
    'Маршруты выбранной авиакомпании и цены эконома на них: минимальная, средняя и максимальная. Списки связаны — в них только сочетания, для которых есть рейсы.',
  airlines:
    'Оплаченные билеты по авиакомпаниям за период оформления: заказы, билеты, выручка, средняя и максимальная цена билета.',
  months: 'Заказы, билеты и выручка по месяцам оформления — по всем авиакомпаниям или по одной.',
  ratings:
    'Все оценки, которые посетители поставили сайту на главной: распределение и итоги. Условий у запроса нет.',
};

/**
 * Форма запроса — обычная GET: параметры попадают в адрес, результат можно открыть
 * по ссылке, и всё работает без JavaScript. Поля — только нужные выбранному запросу.
 */
export function DbQueryForm({
  query,
  cities,
  airlines,
  pairs,
}: {
  query: DbQuery;
  cities: SelectOption[];
  airlines: SelectOption[];
  pairs: RoutePair[];
}) {
  const { report } = query;
  const withDates = report === 'flights' || report === 'airlines' || report === 'months';

  return (
    <form
      action="/database"
      aria-label="Условия запроса"
      className="grid gap-4 rounded-md bg-white p-5 shadow-card md:p-6"
    >
      <input type="hidden" name="report" value={report} />
      <p className="text-slate">{DESCRIPTIONS[report]}</p>

      {report === 'ratings' ? null : (
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {report === 'flights' ? (
            <>
              <Select
                name="from"
                label="Откуда"
                defaultValue={query.from ?? ''}
                options={[{ value: '', label: 'Любой город' }, ...cities]}
              />
              <Select
                name="to"
                label="Куда"
                defaultValue={query.to ?? ''}
                options={[{ value: '', label: 'Любой город' }, ...cities]}
              />
            </>
          ) : null}

          {report === 'routes' ? (
            <RouteSelects
              airlines={airlines.filter(
                (option) =>
                  !query.to ||
                  pairs.some(
                    (pair) => pair.airline === option.value && pair.destination === query.to,
                  ),
              )}
              destinations={cities.filter(
                (option) =>
                  !query.airline ||
                  pairs.some(
                    (pair) => pair.destination === option.value && pair.airline === query.airline,
                  ),
              )}
              pairs={pairs}
              airline={query.airline ?? ''}
              destination={query.to ?? ''}
            />
          ) : report === 'flights' || report === 'months' ? (
            <Select
              name="airline"
              label="Авиакомпания"
              defaultValue={query.airline ?? ''}
              options={[{ value: '', label: 'Все авиакомпании' }, ...airlines]}
            />
          ) : null}

          {report === 'flights' ? (
            <Select
              name="sort"
              label="Сортировка"
              defaultValue={query.sort}
              options={(Object.keys(FLIGHT_SORTS) as FlightSort[]).map((key) => ({
                value: key,
                label: FLIGHT_SORTS[key],
              }))}
            />
          ) : null}

          {withDates ? (
            <>
              <Input
                name="dateFrom"
                type="date"
                label={report === 'flights' ? 'Вылет с даты' : 'Заказы с даты'}
                defaultValue={query.dateFrom ?? ''}
              />
              <Input
                name="dateTo"
                type="date"
                label="По дату включительно"
                defaultValue={query.dateTo ?? ''}
              />
            </>
          ) : null}
        </div>
      )}

      {report === 'ratings' ? null : (
        <p className="text-sm text-slate">Пустые поля не ограничивают выборку.</p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit">Выполнить запрос</Button>
        {report === 'routes' ? (
          // Без JavaScript списки сужает сервер: эта кнопка присылает выбор и получает новые списки.
          <noscript>
            <Button type="submit" variant="secondary">
              Обновить списки
            </Button>
          </noscript>
        ) : null}
        <Link href={`/database?report=${report}`}>Сбросить</Link>
      </div>
    </form>
  );
}
