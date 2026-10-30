import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listAirlines, listCities } from '@/modules/catalog-data/server';
import { listRoutesForAdmin } from '@/modules/flights/server';
import { AdminRouteTable } from '@/modules/flights/ui';
import { plural } from '@/shared/lib/format';
import { Button, buttonClasses } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Рейсы — админка', robots: { index: false } };

const flightsCount = (count: number) => `${count} ${plural(count, ['рейс', 'рейса', 'рейсов'])}`;

export default async function AdminFlightsPage(props: PageProps<'/admin/flights'>) {
  await requireAdmin('/admin/flights');
  const params = await props.searchParams;
  const [routes, cities, airlines] = await Promise.all([
    listRoutesForAdmin(params),
    listCities(),
    listAirlines(),
  ]);
  const city = typeof params.city === 'string' ? params.city : '';
  const airline = typeof params.airline === 'string' ? params.airline : '';
  const created = Number(params.created);
  const deleted = Number(params.deleted);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href="/admin">← Админка</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Рейсы</h1>
        <Link href="/admin/flights/new" className={buttonClasses()}>
          Добавить рейсы
        </Link>
      </header>
      <p className="max-w-3xl text-slate">
        Рейсы заводятся по расписанию: авиакомпания, аэропорты, время вылета, период и дни недели.
        После этого маршрут появляется в поиске рейсов и в связанных списках вкладки «БД». Маршрут,
        на который не продано ни одного билета, можно удалить.
      </p>

      <form
        action="/admin/flights"
        aria-label="Фильтр маршрутов"
        className="grid items-end gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))_auto]"
      >
        <Select
          name="city"
          label="Город"
          defaultValue={city}
          options={[
            { value: '', label: 'Все города' },
            ...cities.map((item) => ({ value: item.slug, label: item.name })),
          ]}
        />
        <Select
          name="airline"
          label="Авиакомпания"
          defaultValue={airline}
          options={[
            { value: '', label: 'Все авиакомпании' },
            ...airlines.map((item) => ({ value: item.code, label: item.name })),
          ]}
        />
        <div className="flex items-center gap-4">
          <Button type="submit">Показать</Button>
          {city || airline ? <Link href="/admin/flights">Сбросить</Link> : null}
        </div>
      </form>

      {routes.length > 0 ? (
        <AdminRouteTable routes={routes} />
      ) : (
        <p className="text-slate">Рейсов с такими условиями нет.</p>
      )}

      {created > 0 ? <Toast message={`Создано: ${flightsCount(created)}.`} /> : null}
      {deleted > 0 ? <Toast message={`Удалено: ${flightsCount(deleted)}.`} /> : null}
    </div>
  );
}
