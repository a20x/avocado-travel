import Link from 'next/link';
import { Fragment, Suspense } from 'react';
import { getAdsFor } from '@/modules/ads/server';
import { AdCard } from '@/modules/ads/ui';
import { listCities } from '@/modules/catalog-data/server';
import { searchQuerySchema, searchUrl } from '@/modules/flights';
import { listNearestSearchDates, searchFlights } from '@/modules/flights/server';
import {
  FlightCard,
  FlightFilters,
  FlightListSkeleton,
  SearchProblem,
  SortLinks,
} from '@/modules/flights/ui';
import { formatDate, plural } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Поиск рейсов',
  description: 'Рейсы на выбранную дату: сортировка по цене, времени вылета и длительности.',
  path: '/flights',
});

type Params = Awaited<PageProps<'/flights'>['searchParams']>;

/** Ссылка «Изменить запрос»: главная с прошлым запросом в полях поиска-фразы. */
function editHref(params: Params): string {
  const keep = new URLSearchParams();
  for (const key of ['from', 'to', 'date', 'passengers', 'cabinClass']) {
    const value = params[key];
    if (typeof value === 'string') keep.set(key, value);
  }
  return keep.size > 0 ? `/?${keep}` : '/';
}

/** Список рейсов — отдельный компонент, чтобы на время поиска показать заглушку. */
async function Results({ params }: { params: Params }) {
  const result = await searchFlights(params);
  if (!result.ok) return <SearchProblem problem={result.error} editHref={editHref(params)} />;

  const { query, offers, airlines } = result.data;
  if (airlines.length === 0) {
    // На эту дату пусто — предлагаем ближайшие даты, когда по направлению летаем.
    const dates = await listNearestSearchDates(query);
    return (
      <SearchProblem
        problem="NO_FLIGHTS"
        editHref={editHref(params)}
        nearest={dates.map((date) => ({
          date,
          // Без фильтров: на другую дату они могли бы отсеять все рейсы.
          href: searchUrl({
            from: query.from,
            to: query.to,
            date,
            passengers: query.passengers,
            cabinClass: query.cabinClass,
          }),
        }))}
      />
    );
  }

  // «Выгодно» — только если самая низкая цена у одного рейса, иначе плашка ничего не выделяет.
  // Нет рейсов — нет и рекламы: показ не засчитывается впустую.
  const [ad] = offers.length > 0 ? await getAdsFor('search') : [];
  // Реклама — после третьего рейса (или после последнего, если рейсов меньше).
  const adAfter = Math.min(3, offers.length) - 1;
  const prices = offers.map((offer) => offer.price);
  const bestPrice = Math.min(...prices);
  const bestIsUnique = prices.filter((price) => price === bestPrice).length === 1;
  const flightHref = (id: string) =>
    `/flights/${id}?passengers=${query.passengers}&cabinClass=${query.cabinClass}`;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16.25rem_minmax(0,1fr)]">
      <FlightFilters query={query} airlines={airlines} />
      <section aria-labelledby="results-title" className="grid gap-4">
        <h2 id="results-title" className="sr-only">
          Найденные рейсы
        </h2>
        <SortLinks query={query} />
        <p className="text-sm text-slate">
          Найдено {offers.length} {plural(offers.length, ['рейс', 'рейса', 'рейсов'])} · время
          местное ·{' '}
          <a
            href={`/api/v1/export/flights?format=csv&date=${query.date}&from=${query.from}&to=${query.to}`}
            download
          >
            Скачать расписание маршрута (CSV)
          </a>
        </p>
        {offers.length === 0 ? (
          <SearchProblem problem="NO_MATCHES" editHref={editHref(params)} />
        ) : (
          offers.map((offer, i) => (
            <Fragment key={offer.id}>
              <FlightCard
                offer={offer}
                href={flightHref(offer.id)}
                isBestPrice={offers.length > 1 && bestIsUnique && offer.price === bestPrice}
              />
              {ad && i === adAfter ? <AdCard ad={ad} layout="horizontal" /> : null}
            </Fragment>
          ))
        )}
      </section>
    </div>
  );
}

export default async function FlightsPage(props: PageProps<'/flights'>) {
  const [params, cities] = await Promise.all([props.searchParams, listCities()]);
  const parsed = searchQuerySchema.safeParse(params);
  const cityName = (slug: string) => cities.find((city) => city.slug === slug)?.name ?? slug;

  return (
    <>
      <div className="border-b border-line bg-white py-6">
        <div className="container-site flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-lg font-medium md:text-xl">
            {parsed.success ? (
              <>
                <b className="font-semibold">{cityName(parsed.data.from)}</b> →{' '}
                <b className="font-semibold">{cityName(parsed.data.to)}</b>,{' '}
                <b className="font-semibold">{formatDate(parsed.data.date)}</b>,{' '}
                {parsed.data.passengers}{' '}
                {plural(parsed.data.passengers, ['пассажир', 'пассажира', 'пассажиров'])},{' '}
                {parsed.data.cabinClass === 'business' ? 'бизнес' : 'эконом'}
              </>
            ) : (
              'Поиск рейсов'
            )}
          </h1>
          <Link href={editHref(params)} className={buttonClasses({ variant: 'secondary' })}>
            Изменить запрос
          </Link>
        </div>
      </div>

      <div className="container-site py-6">
        {/* Новый запрос — новый ключ: React заново показывает заглушку, пока ищутся рейсы. */}
        <Suspense key={JSON.stringify(params)} fallback={<FlightListSkeleton />}>
          <Results params={params} />
        </Suspense>
      </div>
    </>
  );
}
