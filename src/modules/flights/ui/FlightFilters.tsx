'use client';

import Form from 'next/form';
import { useState, type ChangeEvent } from 'react';
import { AirlineLogo } from '@/modules/catalog-data/ui';
import { cn } from '@/shared/lib/cn';
import { formatPrice } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import type { AirlineFacet, DeparturePeriod, SearchQuery } from '../model';

type FlightFiltersProps = {
  query: SearchQuery;
  airlines: AirlineFacet[];
};

const PERIODS: Array<{ value: DeparturePeriod; label: string }> = [
  { value: 'morning', label: 'Утро, 06–12' },
  { value: 'day', label: 'День, 12–18' },
  { value: 'evening', label: 'Вечер, 18–24' },
];

const checkboxClasses = 'size-[18px] shrink-0 accent-leaf';
const optionClasses = 'flex items-center gap-2.5 py-1';

/**
 * Фильтры результатов. Это форма GET: выбранные фильтры попадают в адрес страницы,
 * поэтому ссылкой на результаты можно поделиться, а сервер отдаёт уже отфильтрованный список.
 * Клиентский компонент — только ради двух удобств: форма отправляется сама при каждом
 * изменении, а на телефоне панель раскрывается кнопкой.
 */
export function FlightFilters({ query, airlines }: FlightFiltersProps) {
  const [open, setOpen] = useState(false);
  const submit = (event: ChangeEvent<HTMLFormElement>) => event.currentTarget.requestSubmit();

  return (
    <div className="grid content-start gap-3">
      <button
        type="button"
        className={cn(buttonClasses({ variant: 'secondary' }), 'justify-self-start lg:hidden')}
        aria-expanded={open}
        aria-controls="flight-filters"
        onClick={() => setOpen((value) => !value)}
      >
        Фильтры
      </button>

      <Card id="flight-filters" className={cn('p-5', open ? 'block' : 'hidden lg:block')}>
        <Form action="/flights" onChange={submit} aria-label="Фильтры" className="grid gap-5">
          {/* Сам запрос не меняется — передаём его дальше скрытыми полями. */}
          <input type="hidden" name="from" value={query.from} />
          <input type="hidden" name="to" value={query.to} />
          <input type="hidden" name="date" value={query.date} />
          <input type="hidden" name="passengers" value={query.passengers} />
          <input type="hidden" name="cabinClass" value={query.cabinClass} />
          <input type="hidden" name="sort" value={query.sort} />

          <fieldset>
            <legend className="mb-2 font-semibold">Авиакомпании</legend>
            {airlines.map((airline) => (
              <label key={airline.code} className={optionClasses}>
                <input
                  type="checkbox"
                  name="airlines"
                  value={airline.code}
                  defaultChecked={query.airlines.includes(airline.code)}
                  className={checkboxClasses}
                />
                <AirlineLogo airline={airline} size={24} />
                <span>{airline.name}</span>
                <span className="ml-auto text-sm whitespace-nowrap text-slate">
                  от {formatPrice(airline.minPrice)}
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-semibold">Время вылета</legend>
            {PERIODS.map((period) => (
              <label key={period.value} className={optionClasses}>
                <input
                  type="checkbox"
                  name="times"
                  value={period.value}
                  defaultChecked={query.times.includes(period.value)}
                  className={checkboxClasses}
                />
                <span>{period.label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-semibold">Багаж</legend>
            <label className={optionClasses}>
              <input
                type="checkbox"
                name="baggage"
                defaultChecked={query.baggage}
                className={checkboxClasses}
              />
              <span>Только с багажом</span>
            </label>
          </fieldset>

          {/* Без JavaScript форма сама не отправится — для этого кнопка. */}
          <button type="submit" className={buttonClasses({ variant: 'secondary' })}>
            Применить
          </button>
        </Form>
      </Card>
    </div>
  );
}
