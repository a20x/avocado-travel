import { formatDate, plural } from '@/shared/lib/format';
import { dateInZone } from '@/shared/lib/time';
import { Badge } from '@/shared/ui/Badge';
import { ConfirmButton } from '@/shared/ui/ConfirmButton';
import { Table } from '@/shared/ui/Table';
import type { AdminRoute } from '../schedule';
import { deleteRouteAction } from '../server/actions';

const day = (at: Date) => formatDate(dateInZone(at, 'Europe/Moscow'), { year: true });

/**
 * Маршруты в админке: рейсы одной авиакомпании между двумя аэропортами. Удалить можно
 * маршрут без билетов — например, заведённый по ошибке.
 */
export function AdminRouteTable({ routes }: { routes: AdminRoute[] }) {
  return (
    <Table caption="Маршруты по алфавиту городов">
      <thead>
        <tr>
          <th scope="col">Маршрут</th>
          <th scope="col">Авиакомпания</th>
          <th scope="col">Рейсы</th>
          <th scope="col">Период</th>
          <th scope="col">Билеты</th>
          <th scope="col">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {routes.map((route) => {
          const name = `${route.originCity} (${route.originIata}) → ${route.destinationCity} (${route.destinationIata})`;
          return (
            <tr key={`${route.airlineCode}-${route.originIata}-${route.destinationIata}`}>
              <td className="min-w-64">{name}</td>
              <td>{route.airlineName}</td>
              <td className="whitespace-nowrap">{route.flights.toLocaleString('ru-RU')}</td>
              <td className="whitespace-nowrap">
                {day(route.first)} — {day(route.last)}
              </td>
              <td className="whitespace-nowrap">
                {route.tickets > 0 ? route.tickets.toLocaleString('ru-RU') : <Badge>нет</Badge>}
              </td>
              <td>
                {route.tickets > 0 ? null : (
                  <ConfirmButton
                    label="Удалить"
                    title="Удалить рейсы маршрута?"
                    text={`${route.flights} ${plural(route.flights, ['рейс', 'рейса', 'рейсов'])} ${route.airlineName} по маршруту ${name} будут удалены.`}
                    confirmLabel="Удалить"
                    action={deleteRouteAction}
                    permalink="/admin/flights"
                  >
                    <input type="hidden" name="airline" value={route.airlineCode} />
                    <input type="hidden" name="origin" value={route.originIata} />
                    <input type="hidden" name="destination" value={route.destinationIata} />
                  </ConfirmButton>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
