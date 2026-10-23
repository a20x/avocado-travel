import Link from 'next/link';
import { searchUrl } from '@/modules/flights';
import type { RouteMapData } from '../model';

/**
 * Те же маршруты списком: для тех, кто не пользуется картой мышью или у кого не загрузился
 * JavaScript. Каждый город прилёта — ссылка на поиск рейсов.
 */
export function RouteList({ data, searchDate }: { data: RouteMapData; searchDate: string }) {
  const cities = [...data.cities].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return (
    <details className="rounded-md bg-white p-4 shadow-card">
      <summary className="cursor-pointer font-semibold">Маршруты списком</summary>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => (
          <div key={city.slug}>
            <dt className="font-semibold">{city.name}</dt>
            <dd className="text-sm">
              {(data.destinations[city.slug] ?? []).map((destination, i) => (
                <span key={destination.slug}>
                  {i > 0 ? ', ' : null}
                  <Link
                    href={searchUrl({ from: city.slug, to: destination.slug, date: searchDate })}
                  >
                    {destination.name}
                  </Link>
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
