import Link from 'next/link';
import { weatherCityHref, type GeoCity } from '../model';

/** Города по запросу на странице «Погода»: выбор — переход на погоду в городе. */
export function CitySearchResults({ query, cities }: { query: string; cities: GeoCity[] | null }) {
  if (cities === null) {
    return (
      <p role="alert" className="rounded-sm bg-warning-bg px-4 py-3 text-warning">
        Поиск городов сейчас недоступен — загляните позже.
      </p>
    );
  }
  return (
    <section aria-labelledby="city-results-title" className="grid gap-3">
      <h2 id="city-results-title" className="text-xl">
        {cities.length > 0 ? `Города по запросу «${query}»` : `Город «${query}» не найден`}
      </h2>
      {cities.length > 0 ? (
        <ul className="grid gap-1">
          {cities.map((city) => (
            <li key={city.id}>
              <Link href={weatherCityHref(city.id)} className="font-semibold">
                {city.name}
              </Link>
              {city.area ? <span className="text-slate">, {city.area}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate">Проверьте написание — или введите только начало названия.</p>
      )}
    </section>
  );
}
