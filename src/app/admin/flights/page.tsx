import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/modules/auth/server';
import { listAirlines, listCities } from '@/modules/catalog-data/server';
import { getRoutesForAdmin } from '@/modules/flights/server';
import { AdminRouteTable } from '@/modules/flights/ui';
import { plural } from '@/shared/lib/format';
import { returnPath, withBack } from '@/shared/lib/return-path';
import { Button, buttonClasses } from '@/shared/ui/Button';
import { LinkedSelects } from '@/shared/ui/LinkedSelects';
import { Toast } from '@/shared/ui/Toast';

export const metadata: Metadata = { title: 'Рейсы — админка', robots: { index: false } };

const flightsCount = (count: number) => `${count} ${plural(count, ['рейс', 'рейса', 'рейсов'])}`;

export default async function AdminFlightsPage(props: PageProps<'/admin/flights'>) {
  const params = await props.searchParams;
  const back = returnPath(params.back);
  await requireAdmin(withBack('/admin/flights', back));
  const [{ routes, combos, city, airline, dropped }, cities, airlines] = await Promise.all([
    getRoutesForAdmin(params),
    listCities(),
    listAirlines(),
  ]);
  const created = Number(params.created);
  const deleted = Number(params.deleted);

  return (
    <div className="container-site grid gap-6 py-8">
      <p>
        <Link href={back ?? '/admin'}>{back ? '← Назад' : '← Админка'}</Link>
      </p>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl">Рейсы</h1>
        <Link
          href={withBack('/admin/flights/new', withBack('/admin/flights', back))}
          className={buttonClasses()}
        >
          Добавить рейсы
        </Link>
      </header>
      <p className="max-w-3xl text-slate">
        Рейсы заводятся по расписанию: авиакомпания, аэропорты, время вылета, период и дни недели.
        После этого маршрут появляется в поиске рейсов и в связанных списках вкладки «БД». Маршрут,
        на который не продано ни одного билета, можно удалить. Списки фильтра связаны: в них только
        сочетания, для которых есть рейсы.
      </p>

      <form
        action="/admin/flights"
        aria-label="Фильтр маршрутов"
        className="grid items-end gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))_auto]"
      >
        {back ? <input type="hidden" name="back" value={back} /> : null}
        <LinkedSelects
          fields={[
            {
              name: 'city',
              label: 'Город',
              anyLabel: 'Все города',
              options: cities.map((item) => ({ value: item.slug, label: item.name })),
            },
            {
              name: 'airline',
              label: 'Авиакомпания',
              anyLabel: 'Все авиакомпании',
              options: airlines.map((item) => ({ value: item.code, label: item.name })),
            },
          ]}
          combos={combos}
          initial={{ city, airline }}
        />
        <div className="flex items-center gap-4">
          <Button type="submit">Показать</Button>
          {city || airline ? <Link href={withBack('/admin/flights', back)}>Сбросить</Link> : null}
        </div>
      </form>

      {dropped ? (
        <p role="status" className="text-sm text-slate">
          У этой авиакомпании нет рейсов в выбранный город, поэтому условие снято. В списках
          остаются только сочетания, для которых есть рейсы.
        </p>
      ) : null}

      {routes.length > 0 ? (
        <AdminRouteTable routes={routes} back={back} />
      ) : (
        <p className="text-slate">Рейсов с такими условиями нет.</p>
      )}

      {created > 0 ? <Toast message={`Создано: ${flightsCount(created)}.`} /> : null}
      {deleted > 0 ? <Toast message={`Удалено: ${flightsCount(deleted)}.`} /> : null}
    </div>
  );
}
