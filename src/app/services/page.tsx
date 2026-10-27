import Link from 'next/link';
import { listCities } from '@/modules/catalog-data/server';
import { parseAmount } from '@/modules/currency';
import { getRates } from '@/modules/currency/server';
import { Converter } from '@/modules/currency/ui';
import { defaultSearchDate } from '@/modules/flights';
import { getActivePoll } from '@/modules/poll/server';
import { PollWidget } from '@/modules/poll/ui';
import { getRouteMap } from '@/modules/route-map/server';
import { RouteList, RouteMap } from '@/modules/route-map/ui';
import { MonthCalendar, WorldClock } from '@/modules/world-clock/ui';
import { formatDate } from '@/shared/lib/format';
import { dateInZone } from '@/shared/lib/time';
import { Card } from '@/shared/ui/Card';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Сервисы',
  description:
    'Сервисы Avocado Travel: карта маршрутов, мировые часы и календарь, конвертер валют по курсу ЦБ, опрос.',
  path: '/services',
});

/** Страница сервисов (docs/02-product.md): карта, часы и календарь, конвертер, опрос. */
export default async function ServicesPage(props: PageProps<'/services'>) {
  const now = new Date();
  const [params, rates, routeMap, cities, poll] = await Promise.all([
    props.searchParams,
    getRates(),
    getRouteMap(now),
    listCities(),
    getActivePoll(),
  ]);
  const searchDate = defaultSearchDate(now);
  const clockCities = [...cities]
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .map(({ slug, name, timezone }) => ({ slug, name, timezone }));

  return (
    <div className="container-site grid gap-12 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Сервисы</h1>
        <p className="text-slate">
          Полезное перед поездкой: куда летаем, который час в городе прилёта и сколько стоит билет в
          валюте страны. Погода в любом городе — на странице <Link href="/weather">«Погода»</Link>.
        </p>
      </header>

      <section id="map" aria-labelledby="map-title" className="grid scroll-mt-4 gap-4">
        <div className="grid gap-1">
          <h2 id="map-title" className="text-2xl">
            Карта маршрутов
          </h2>
          <p className="text-slate">
            {routeMap.cities.length} городов и {routeMap.links.length} маршрутов на ближайшую
            неделю. Нажмите на город — подсветятся его рейсы, а из списка можно перейти к поиску.
          </p>
        </div>
        <RouteMap data={routeMap} searchDate={searchDate} />
        <RouteList data={routeMap} searchDate={searchDate} />
      </section>

      <section id="clock" aria-labelledby="clock-title" className="grid scroll-mt-4 gap-4">
        <div className="grid gap-1">
          <h2 id="clock-title" className="text-2xl">
            Мировые часы и календарь
          </h2>
          <p className="text-slate">
            Время в аэропортах всегда местное — здесь видно, сколько сейчас в городе прилёта.
          </p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <WorldClock
            cities={clockCities}
            defaultFrom="moscow"
            defaultTo="vladivostok"
            initialNow={now.getTime()}
          />
          <MonthCalendar today={dateInZone(now, 'Europe/Moscow')} />
        </div>
      </section>

      <section id="converter" aria-labelledby="converter-title" className="grid scroll-mt-4 gap-4">
        <div className="grid gap-1">
          <h2 id="converter-title" className="text-2xl">
            Конвертер валют
          </h2>
          <p className="text-slate">
            Цены на сайте — в рублях. Пересчёт по курсу ЦБ
            {rates ? ` на ${formatDate(rates.date)}` : ''} — только для информации.
          </p>
        </div>
        {rates ? (
          <Converter
            rates={rates}
            initialAmount={parseAmount(
              typeof params.amount === 'string' ? params.amount : undefined,
            )}
          />
        ) : (
          <Card className="p-5">
            <p>
              Курсы ЦБ сейчас недоступны, поэтому пересчитать сумму не получится. Загляните позже.
            </p>
          </Card>
        )}
      </section>

      {poll ? (
        <div className="max-w-xl">
          <PollWidget poll={poll} permalink="/services" />
        </div>
      ) : null}
    </div>
  );
}
