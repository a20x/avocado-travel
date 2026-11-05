import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { adminRouteHref } from '@/modules/flights';
import { getRouteFlights } from '@/modules/flights/server';
import { RouteFlightsTable } from '@/modules/flights/ui';
import { plural } from '@/shared/lib/format';
import { buttonClasses } from '@/shared/ui/Button';
import { Pagination } from '@/shared/ui/Pagination';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Рейсы маршрута — админка', robots: { index: false } };

const flightsCount = (count: number) => `${count} ${plural(count, ['рейс', 'рейса', 'рейсов'])}`;

/** Маршрут в админке: предстоящие рейсы с правкой каждого и правка всех сразу. */
export default async function AdminRoutePage(props: PageProps<'/admin/flights/route'>) {
  const params = await props.searchParams;
  await requireAdmin('/admin/flights');
  const route = await getRouteFlights(params);
  if (!route) notFound();
  const { ref, title } = route;
  const updated = Number(params.updated);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={`/admin/flights?airline=${ref.airline}`}>← Все рейсы</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">
          {title.originCity} ({ref.origin}) → {title.destinationCity} ({ref.destination})
        </h1>
        {route.upcoming > 0 ? (
          <Link
            href={adminRouteHref(ref, {}, '/admin/flights/route/edit')}
            className={buttonClasses()}
          >
            Изменить все предстоящие рейсы
          </Link>
        ) : null}
      </header>
      <p className="max-w-3xl text-slate">
        {title.airlineName}: впереди {flightsCount(route.upcoming)}, уже улетело{' '}
        {flightsCount(route.past)} — их не изменить. «Изменить» у рейса — дата, время, самолёт и
        цены одного рейса; кнопка выше меняет все предстоящие рейсы маршрута сразу.
      </p>

      {route.flights.length > 0 ? (
        <>
          <RouteFlightsTable
            flights={route.flights}
            page={route.page}
            totalPages={route.totalPages}
            back={adminRouteHref(ref, route.page > 1 ? { page: route.page } : {})}
          />
          <Pagination
            page={route.page}
            totalPages={route.totalPages}
            href={(page) => adminRouteHref(ref, { page })}
          />
        </>
      ) : (
        <p className="text-slate">Предстоящих рейсов нет.</p>
      )}

      {params.saved ? <Toast message="Рейс изменён." /> : null}
      {updated > 0 ? <Toast message={`Изменено: ${flightsCount(updated)}.`} /> : null}
    </div>
  );
}
