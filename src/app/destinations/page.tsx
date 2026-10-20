import type { Metadata } from 'next';
import { connection } from 'next/server';
import { CityCard, type City } from '@/modules/catalog-data';
import { listCities } from '@/modules/catalog-data/server';
import type { DestinationStats } from '@/modules/flights';
import { listDestinationStats } from '@/modules/flights/server';
import { formatPrice, plural } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';

export const metadata: Metadata = {
  title: 'Направления',
  description: 'Города России и зарубежья, куда летают авиакомпании Avocado Travel.',
};

const HOME_COUNTRY = 'Россия';

function CityGrid({
  title,
  cities,
  stats,
}: {
  title: string;
  cities: City[];
  stats: Map<string, DestinationStats>;
}) {
  return (
    <section className="grid gap-4">
      <h2 className="text-2xl">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cities.map((city) => {
          const s = stats.get(city.slug);
          return (
            <CityCard
              key={city.slug}
              city={city}
              details={
                s
                  ? `из ${s.originCount} ${plural(s.originCount, ['города', 'городов', 'городов'])} · ${s.flightsPerWeek} ${plural(s.flightsPerWeek, ['рейс', 'рейса', 'рейсов'])} в неделю`
                  : 'на этой неделе рейсов нет'
              }
              badge={s ? <Badge>от {formatPrice(s.minPrice)}</Badge> : null}
            />
          );
        })}
      </div>
    </section>
  );
}

export default async function DestinationsPage() {
  // Статистика считается от текущего момента, поэтому страница собирается на каждый запрос,
  // а не один раз при сборке сайта.
  await connection();
  const [cities, stats] = await Promise.all([listCities(), listDestinationStats()]);
  const home = cities.filter((city) => city.country === HOME_COUNTRY);
  const abroad = cities.filter((city) => city.country !== HOME_COUNTRY);

  return (
    <div className="container-site grid gap-10 py-8">
      <header className="grid max-w-2xl gap-2">
        <h1 className="text-3xl">Направления</h1>
        <p className="text-slate">
          Летаем в {cities.length} {plural(cities.length, ['город', 'города', 'городов'])}:{' '}
          {home.length} в России и {abroad.length} за рубежом. Цены — самые низкие в эконом-классе
          на ближайшую неделю.
        </p>
      </header>
      <CityGrid title="Россия" cities={home} stats={stats} />
      <CityGrid title="За рубежом" cities={abroad} stats={stats} />
    </div>
  );
}
