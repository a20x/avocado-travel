'use client';

// Клиентский компонент: «Куда», календарь и подсказка меняются вместе с выбранным «Откуда».
import Form from 'next/form';
import { useState } from 'react';
import type { City } from '@/modules/catalog-data';
import { weekdaysLabel } from '@/shared/lib/available-days';
import { cn } from '@/shared/lib/cn';
import { buttonClasses } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { DatePicker } from '@/shared/ui/DatePicker';
import { MAX_PASSENGERS, type SearchQuery, type SearchRoute } from '../model';
import { weekday } from '../schedule';
import { PhraseSelect } from './PhraseSelect';

type SearchPhraseProps = {
  /** Города по алфавиту. */
  cities: Array<Pick<City, 'slug' | 'nameFrom' | 'nameTo'>>;
  /** Направления с рейсами в окне продажи: из них строятся «Откуда» и «Куда». */
  routes: SearchRoute[];
  /** Что подставить в поля: прошлый запрос или значения по умолчанию. */
  defaults: Pick<SearchQuery, 'from' | 'to' | 'date' | 'passengers' | 'cabinClass'>;
  /** Границы выбора даты: сегодня и через 60 дней. */
  minDate: string;
  maxDate: string;
};

const clamp = (date: string, min: string, max: string) =>
  date < min ? min : date > max ? max : date;

/**
 * Поиск-фраза (docs/06-design.md): «Я лечу из [Москвы] в [Калининград] [14 ноября], нас [2],
 * класс [эконом]». В «Откуда» — города, откуда есть рейсы, в «Куда» — только города, куда из
 * выбранного можно улететь; календарь ограничен днями этих рейсов, подсказка называет дни
 * недели. Обычная форма GET: без JavaScript она просто открывает страницу результатов,
 * а с ним <Form> из Next.js переходит туда без перезагрузки.
 */
export function SearchPhrase({ cities, routes, defaults, minDate, maxDate }: SearchPhraseProps) {
  const fromCities = cities.filter((city) => routes.some((route) => route.from === city.slug));
  const toCities = (from: string) =>
    cities.filter((city) => routes.some((route) => route.from === from && route.to === city.slug));
  const pick = (slug: string, list: typeof cities) =>
    list.some((city) => city.slug === slug) ? slug : (list[0]?.slug ?? slug);

  const [from, setFrom] = useState(() => pick(defaults.from, fromCities));
  const [to, setTo] = useState(() => pick(defaults.to, toCities(from)));
  const route = routes.find((item) => item.from === from && item.to === to);
  const min = route && route.first > minDate ? route.first : minDate;
  const max = route && route.last < maxDate ? route.last : maxDate;
  const [date, setDate] = useState(() => clamp(defaults.date, min, max));

  const fromCity = cities.find((city) => city.slug === from);
  const toCity = cities.find((city) => city.slug === to);
  const noFlightsThatDay = route && date && !route.weekdays.includes(weekday(date));

  /** Сменили «Откуда» — «Куда» остаётся, если туда летают, иначе — первый доступный город. */
  const changeFrom = (next: string) => {
    const nextTo = pick(to, toCities(next));
    const nextRoute = routes.find((item) => item.from === next && item.to === nextTo);
    setFrom(next);
    setTo(nextTo);
    if (nextRoute) setDate((current) => clamp(current, nextRoute.first, nextRoute.last));
  };
  const changeTo = (next: string) => {
    const nextRoute = routes.find((item) => item.from === from && item.to === next);
    setTo(next);
    if (nextRoute) setDate((current) => clamp(current, nextRoute.first, nextRoute.last));
  };

  return (
    <Card as="section" aria-labelledby="phrase-title" className="max-w-4xl p-6 md:p-10">
      <h1 id="phrase-title" className="mb-3 text-base font-semibold text-pit">
        Куда летим?
      </h1>
      <Form action="/flights">
        <p className="text-xl leading-[2.2] font-medium sm:text-2xl lg:text-4xl lg:leading-[1.9]">
          Я лечу из{' '}
          <PhraseSelect
            name="from"
            label="Откуда"
            value={from}
            onChange={changeFrom}
            options={fromCities.map((city) => ({ value: city.slug, label: city.nameFrom }))}
          />{' '}
          в{' '}
          <PhraseSelect
            name="to"
            label="Куда"
            value={to}
            onChange={changeTo}
            options={toCities(from).map((city) => ({ value: city.slug, label: city.nameTo }))}
          />{' '}
          <DatePicker
            variant="inline"
            name="date"
            label="Дата вылета"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            min={min}
            max={max}
            required
          />
          , нас{' '}
          <PhraseSelect
            name="passengers"
            label="Сколько пассажиров"
            defaultValue={String(defaults.passengers)}
            options={Array.from({ length: MAX_PASSENGERS }, (_, i) => ({
              value: String(i + 1),
              label: String(i + 1),
            }))}
          />
          , класс{' '}
          <PhraseSelect
            name="cabinClass"
            label="Класс"
            defaultValue={defaults.cabinClass}
            options={[
              { value: 'economy', label: 'эконом' },
              { value: 'business', label: 'бизнес' },
            ]}
          />
          .
        </p>
        {route && fromCity && toCity ? (
          <p
            aria-live="polite"
            className={cn('mt-3', noFlightsThatDay ? 'text-error' : 'text-slate')}
          >
            Из {fromCity.nameFrom} в {toCity.nameTo} летаем {weekdaysLabel(route.weekdays)}.
            {noFlightsThatDay ? ' В выбранный день рейсов нет — выберите другую дату.' : null}
          </p>
        ) : null}
        <button type="submit" className={cn(buttonClasses({ size: 'lg' }), 'mt-6')}>
          Подобрать рейсы →
        </button>
      </Form>
    </Card>
  );
}
