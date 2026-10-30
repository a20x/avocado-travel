import Link from 'next/link';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { LinkedSelects } from '@/shared/ui/LinkedSelects';
import { Select, type SelectOption } from '@/shared/ui/Select';
import { FLIGHT_SORTS, type DbQuery, type FlightCombo, type FlightSort } from '../model';
import { FlightQueryFields } from './FlightQueryFields';

/** Что делает каждый запрос — подпись над формой. */
const DESCRIPTIONS: Record<DbQuery['report'], string> = {
  flights:
    'Рейсы с условиями по городам, авиакомпании и дате вылета, по 20 на страницу. Списки связаны — в них только сочетания, для которых есть рейсы. «Продано» — места, занятые действующими билетами.',
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
  combos,
}: {
  query: DbQuery;
  cities: SelectOption[];
  airlines: SelectOption[];
  /** Сочетания «откуда — куда — авиакомпания», для которых есть рейсы: для связанных списков. */
  combos: FlightCombo[];
}) {
  const { report } = query;
  const withDates = report === 'airlines' || report === 'months';
  const linked = report === 'flights' || report === 'routes';
  const sort = (
    <Select
      name="sort"
      label="Сортировка"
      defaultValue={query.sort}
      options={(Object.keys(FLIGHT_SORTS) as FlightSort[]).map((key) => ({
        value: key,
        label: FLIGHT_SORTS[key],
      }))}
    />
  );

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
            <FlightQueryFields
              cities={cities}
              airlines={airlines}
              combos={combos}
              initial={{ from: query.from, to: query.to, airline: query.airline }}
              dateFrom={query.dateFrom}
              dateTo={query.dateTo}
            >
              {sort}
            </FlightQueryFields>
          ) : null}

          {report === 'routes' ? (
            <LinkedSelects
              fields={[
                {
                  name: 'airline',
                  label: 'Авиакомпания',
                  anyLabel: 'Все авиакомпании',
                  options: airlines,
                },
                { name: 'to', label: 'Направление', anyLabel: 'Все направления', options: cities },
              ]}
              combos={combos}
              initial={{ airline: query.airline, to: query.to }}
            />
          ) : null}

          {report === 'months' ? (
            <Select
              name="airline"
              label="Авиакомпания"
              defaultValue={query.airline ?? ''}
              options={[{ value: '', label: 'Все авиакомпании' }, ...airlines]}
            />
          ) : null}

          {withDates ? (
            <>
              <Input
                name="dateFrom"
                type="date"
                label="Заказы с даты"
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
        {linked ? (
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
