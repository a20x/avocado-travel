import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { cache } from 'react';
import { getCity } from '@/modules/catalog-data/server';
import { defaultSearchDate, searchUrl } from '@/modules/flights';
import { listRoutes } from '@/modules/flights/server';
import { formatDuration, formatPrice, plural } from '@/shared/lib/format';
import { utcOffsetLabel } from '@/shared/lib/time';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Table } from '@/shared/ui/Table';

// Город нужен и для заголовка вкладки, и для страницы — cache не даёт сходить в базу дважды.
const loadCity = cache(getCity);

export async function generateMetadata(
  props: PageProps<'/destinations/[city]'>,
): Promise<Metadata> {
  const city = await loadCity((await props.params).city);
  if (!city) return {};
  return { title: `${city.name} — направление`, description: city.description };
}

export default async function CityPage(props: PageProps<'/destinations/[city]'>) {
  const city = await loadCity((await props.params).city);
  if (!city) notFound();

  await connection();
  const now = new Date();
  const routes = await listRoutes({ to: city.slug }, now);
  const searchDate = defaultSearchDate(now);
  const flightsPerWeek = routes.reduce((sum, route) => sum + route.flightsPerWeek, 0);

  return (
    <div className="container-site grid gap-10 py-8">
      <p>
        <Link href="/destinations">← Все направления</Link>
      </p>

      <header className="grid items-center gap-6 md:grid-cols-2">
        <Image
          src={city.image}
          alt=""
          width={800}
          height={400}
          loading="eager"
          className="h-auto w-full rounded-md"
        />
        <div className="grid gap-4">
          <div>
            <p className="text-slate">{city.country}</p>
            <h1 className="text-3xl">{city.name}</h1>
          </div>
          {city.description ? <p>{city.description}</p> : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <dt className="text-slate">
              {plural(city.airports.length, ['Аэропорт', 'Аэропорты', 'Аэропорты'])}
            </dt>
            <dd>{city.airports.map((a) => `${a.name} (${a.iata})`).join(', ')}</dd>
            <dt className="text-slate">Часовой пояс</dt>
            <dd>{utcOffsetLabel(city.timezone)}</dd>
            <dt className="text-slate">Рейсов в неделю</dt>
            <dd>{flightsPerWeek}</dd>
          </dl>
        </div>
      </header>

      <section className="grid gap-4">
        <h2 className="text-2xl">Откуда летаем</h2>
        {routes.length > 0 ? (
          <Table caption="Прямые рейсы на ближайшую неделю">
            <thead>
              <tr>
                <th scope="col">Откуда</th>
                <th scope="col">Авиакомпании</th>
                <th scope="col">Рейсов в неделю</th>
                <th scope="col">В пути</th>
                <th scope="col">Цена от</th>
                <th scope="col">
                  <span className="sr-only">Поиск</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.origin.slug}>
                  <td className="whitespace-nowrap">
                    <Link href={`/destinations/${route.origin.slug}`}>{route.origin.city}</Link>
                  </td>
                  <td>{route.airlines.map((airline) => airline.name).join(', ')}</td>
                  <td>{route.flightsPerWeek}</td>
                  <td className="whitespace-nowrap">{formatDuration(route.durationMinutes)}</td>
                  <td className="whitespace-nowrap">{formatPrice(route.minPrice)}</td>
                  <td className="whitespace-nowrap">
                    <Link
                      href={searchUrl({ from: route.origin.slug, to: city.slug, date: searchDate })}
                    >
                      Найти рейсы<span className="sr-only"> из города {route.origin.city}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            image="/images/illustrations/no-results.svg"
            title="На ближайшую неделю рейсов нет"
            text="Расписание обновляется — загляните позже или выберите другое направление."
          />
        )}
      </section>
    </div>
  );
}
