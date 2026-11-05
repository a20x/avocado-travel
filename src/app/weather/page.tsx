import { CITY_QUERY_MAX, HOME_WEATHER_COUNT, cityIdSchema, geoPlace } from '@/modules/weather';
import { findCities, getCity, getSavedCities, getWeather } from '@/modules/weather/server';
import {
  CitySearchBox,
  CitySearchResults,
  CityWeatherCard,
  SavedCitiesList,
  SavedCityButton,
} from '@/modules/weather/ui';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { pageMetadata } from '@/shared/lib/metadata';

export const metadata = pageMetadata({
  title: 'Погода',
  description:
    'Погода сейчас и на три дня в любом городе мира: поиск по названию и свой список городов.',
  path: '/weather',
});

/** Адрес страницы с теми же запросом и городом — туда возвращаются формы «добавить» и «удалить». */
function weatherHref(q: string, city: number | null): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (city) params.set('city', String(city));
  return params.size > 0 ? `/weather?${params}` : '/weather';
}

/**
 * Погода в любом городе (docs/02-product.md, «Погода»): поиск города по названию (`?q=`),
 * погода в выбранном (`?city=` — номер города в GeoNames) и «Мои города» из cookie.
 */
export default async function WeatherPage(props: PageProps<'/weather'>) {
  const params = await props.searchParams;
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, CITY_QUERY_MAX) : '';
  const parsedId = cityIdSchema.safeParse(params.city);
  const cityId = parsedId.success ? parsedId.data : null;

  const [found, city, saved] = await Promise.all([
    q ? findCities(q) : null,
    cityId ? getCity(cityId) : null,
    getSavedCities(),
  ]);
  const [cityWeather, savedWeather] = await Promise.all([
    city ? getWeather([geoPlace(city)]) : null,
    getWeather(saved.map(geoPlace)),
  ]);
  const permalink = weatherHref(q, cityId);

  return (
    <div className="container-site grid gap-8 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Погода в любом городе</h1>
        <p className="text-slate">
          Начните вводить название — появятся подсказки; покажем погоду в городе прямо сейчас и на
          три дня. Нужные города отметьте «В мои города» — искать их снова не придётся. До{' '}
          {HOME_WEATHER_COUNT} из них можно вынести «На главную»: они встанут в баннер погоды на
          главной вместо стандартных.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-6">
          {/* Обычная форма GET: запрос — в адресе, работает и без JavaScript. */}
          {/* key: после поиска поле показывает новый запрос, а не набранное до перехода. */}
          <form action="/weather" role="search" className="flex flex-wrap items-end gap-3">
            <CitySearchBox key={q} defaultValue={q} />
            <Button type="submit">Найти</Button>
          </form>

          {q ? <CitySearchResults query={q} cities={found} /> : null}

          {cityId ? (
            city ? (
              <CityWeatherCard
                weather={cityWeather?.[0] ?? null}
                cityName={city.name}
                area={city.area}
                actions={
                  <SavedCityButton
                    cityId={city.id}
                    cityName={city.name}
                    saved={saved.some((c) => c.id === city.id)}
                    permalink={permalink}
                  />
                }
              />
            ) : (
              <Card className="p-5">
                <p>Не удалось найти этот город — попробуйте поискать его по названию.</p>
              </Card>
            )
          ) : null}
        </div>

        <SavedCitiesList cities={saved} weather={savedWeather} permalink={permalink} />
      </div>

      {/* У карточки города подпись об источнике своя. */}
      {city ? null : (
        <p className="text-xs text-slate">
          Данные:{' '}
          <a href="https://open-meteo.com/" rel="noopener">
            Open-Meteo
          </a>{' '}
          (прогноз и поиск городов по базе GeoNames)
        </p>
      )}
    </div>
  );
}
