import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/modules/auth/server';
import { listAircraftModels } from '@/modules/catalog-data/server';
import { adminRouteHref } from '@/modules/flights';
import { getRouteFlights } from '@/modules/flights/server';
import { RouteEditForm } from '@/modules/flights/ui';
import { plural } from '@/shared/lib/format';

export const metadata: Metadata = { title: 'Правка маршрута — админка', robots: { index: false } };

/** Правка всех предстоящих рейсов маршрута сразу. */
export default async function AdminRouteEditPage(props: PageProps<'/admin/flights/route/edit'>) {
  await requireAdmin('/admin/flights');
  const [route, models] = await Promise.all([
    getRouteFlights(await props.searchParams),
    listAircraftModels(),
  ]);
  if (!route) notFound();
  const { ref, title } = route;
  const [sample] = route.flights;

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={adminRouteHref(ref)}>← Рейсы маршрута</Link>
      </p>
      <h1 className="text-3xl">
        Изменить маршрут {title.originCity} ({ref.origin}) → {title.destinationCity} (
        {ref.destination})
      </h1>
      {sample ? (
        <>
          <p className="max-w-3xl text-slate">
            {title.airlineName}: изменения коснутся всех {route.upcoming}{' '}
            {plural(route.upcoming, [
              'предстоящего рейса',
              'предстоящих рейсов',
              'предстоящих рейсов',
            ])}
            . Заполните только то, что нужно поменять, — пустые поля останутся как были. Время
            вылета — местное, тот же день. Улетевшие рейсы и купленные билеты не меняются; обратный
            маршрут правится отдельно.
          </p>
          <RouteEditForm
            route={ref}
            sample={sample}
            aircraft={models
              .map((model) => ({
                value: String(model.id),
                label: `${model.manufacturer} ${model.model}`,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'ru'))}
          />
        </>
      ) : (
        <p className="text-slate">У маршрута нет предстоящих рейсов — менять нечего.</p>
      )}
    </div>
  );
}
