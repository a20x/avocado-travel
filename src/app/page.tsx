import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdsFor } from '@/modules/ads/server';
import { PromoBlocks } from '@/modules/ads/ui';
import { listCities } from '@/modules/catalog-data/server';
import { CityCard } from '@/modules/catalog-data/ui';
import { SEARCH_DAYS_AHEAD, defaultSearchDate, searchQuerySchema } from '@/modules/flights';
import { listRoutes, listSearchRoutes } from '@/modules/flights/server';
import { SearchPhrase } from '@/modules/flights/ui';
import { getActivePoll } from '@/modules/poll/server';
import { PollWidget } from '@/modules/poll/ui';
import { getRating } from '@/modules/rating/server';
import { RatingWidget } from '@/modules/rating/ui';
import { HOME_WEATHER_COUNT, geoPlace, homeWeatherPlaces } from '@/modules/weather';
import { getSavedCities, getWeather } from '@/modules/weather/server';
import { WeatherWidget } from '@/modules/weather/ui';
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME } from '@/shared/config/site';
import { formatDuration, formatPrice, plural } from '@/shared/lib/format';
import { pageMetadata } from '@/shared/lib/metadata';
import { addDays, dateInZone } from '@/shared/lib/time';
import { Badge } from '@/shared/ui/Badge';
import { SiteContents } from './_components/SiteContents';

export const metadata: Metadata = {
  ...pageMetadata({
    title: `${SITE_NAME} — авиабилеты по России и за рубеж`,
    description: SITE_DESCRIPTION,
    path: '/',
    keywords: SITE_KEYWORDS,
  }),
  // У главной заголовок без шаблона «… — Avocado Travel»: название сайта уже в начале.
  title: { absolute: `${SITE_NAME} — авиабилеты по России и за рубеж` },
};

/** Популярные направления считаются от главного узла сети. */
const HUB = 'moscow';
const POPULAR_COUNT = 6;
/**
 * Стандартные города баннера погоды — по порядку, первые четыре свободных места. Обнинска нет
 * среди городов сайта: он задан точкой GeoNames, как город из «Моих городов». За ним — города
 * сети; последние — запас: они встают на место стандартного, который посетитель уже вынес
 * «На главную» сам (два Сочи баннер не покажет).
 */
const OBNINSK = geoPlace({
  id: 516436,
  name: 'Обнинск',
  area: 'Калужская область, Россия',
  lat: 55.10993,
  lon: 36.61238,
});
const WEATHER_CITIES = [
  'sochi',
  'saint-petersburg',
  'vladivostok',
  'kaliningrad',
  'kazan',
  'yekaterinburg',
  'novosibirsk',
];

export default async function HomePage(props: PageProps<'/'>) {
  const now = new Date();
  const [cities, routes, searchRoutes, params, poll, rating, ads, savedCities] = await Promise.all([
    listCities(),
    listRoutes({ from: HUB }, now),
    listSearchRoutes(now),
    props.searchParams,
    getActivePoll(),
    getRating(),
    getAdsFor('home', now),
    getSavedCities(),
  ]);

  // «Изменить запрос» со страницы результатов возвращает сюда с прошлым запросом в адресе.
  const previous = searchQuerySchema.safeParse(params);
  const defaults = previous.success
    ? previous.data
    : {
        from: HUB,
        to: 'kaliningrad',
        date: defaultSearchDate(now),
        passengers: 1,
        cabinClass: 'economy' as const,
      };
  const today = dateInZone(now, 'Europe/Moscow');

  const citiesBySlug = new Map(cities.map((city) => [city.slug, city]));
  const homeWeather = homeWeatherPlaces(
    savedCities,
    [OBNINSK, ...WEATHER_CITIES.flatMap((slug) => citiesBySlug.get(slug) ?? [])],
    HOME_WEATHER_COUNT,
  );
  const weather = await getWeather(homeWeather.places);
  const popular = [...routes]
    .sort((a, b) => b.flightsPerWeek - a.flightsPerWeek)
    .slice(0, POPULAR_COUNT);

  return (
    <>
      <div className="bg-sky bg-[url(/images/illustrations/hero.svg)] bg-cover bg-bottom bg-no-repeat pt-10 pb-40 md:pt-16 md:pb-52">
        <div className="container-site">
          <SearchPhrase
            cities={cities}
            routes={searchRoutes}
            defaults={defaults}
            minDate={today}
            maxDate={addDays(today, SEARCH_DAYS_AHEAD)}
          />
        </div>
      </div>

      <div className="container-site grid gap-12 py-12">
        <section className="grid gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl">Популярные направления из Москвы</h2>
            <Link href="/destinations">Все направления</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((route) => {
              const city = citiesBySlug.get(route.destination.slug);
              if (!city) return null;
              const perDay = Math.round(route.flightsPerWeek / 7);
              return (
                <CityCard
                  key={city.slug}
                  city={city}
                  details={`${formatDuration(route.durationMinutes)} · ${perDay} ${plural(perDay, ['рейс', 'рейса', 'рейсов'])} в день`}
                  badge={<Badge>от {formatPrice(route.minPrice)}</Badge>}
                />
              );
            })}
          </div>
        </section>

        <PromoBlocks ads={ads} />

        {/* Погода, опрос, рейтинг — в одном ряду (docs/06-design.md). */}
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          <WeatherWidget weather={weather} mine={homeWeather.mine} />
          {poll ? <PollWidget poll={poll} /> : null}
          <RatingWidget rating={rating} />
        </div>

        <SiteContents />
      </div>
    </>
  );
}
