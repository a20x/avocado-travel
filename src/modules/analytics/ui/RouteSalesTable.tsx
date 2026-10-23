import { formatPrice } from '@/shared/lib/format';
import { Table } from '@/shared/ui/Table';
import type { RouteSales, SalesTotals } from '../model';

const number = new Intl.NumberFormat('ru-RU');
/** Столько маршрутов показываем: остальные учтены в строке «Итого». */
export const ROUTES_SHOWN = 15;

/** Отчёт 5: продажи по маршрутам с итогами — количество, сумма, средний и максимальный чек. */
export function RouteSalesTable({ routes, totals }: { routes: RouteSales[]; totals: SalesTotals }) {
  const cells = (row: SalesTotals) => (
    <>
      <td className="text-right tabular-nums">{number.format(row.orders)}</td>
      <td className="text-right tabular-nums">{number.format(row.tickets)}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{formatPrice(row.revenue)}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{formatPrice(row.averageCheck)}</td>
      <td className="text-right tabular-nums whitespace-nowrap">{formatPrice(row.maxCheck)}</td>
    </>
  );
  return (
    <Table
      caption={
        routes.length > ROUTES_SHOWN
          ? `Самые доходные маршруты: ${ROUTES_SHOWN} из ${routes.length}`
          : 'Продажи по маршрутам'
      }
    >
      <thead>
        <tr>
          <th scope="col">Маршрут</th>
          <th scope="col" className="text-right">
            Заказов
          </th>
          <th scope="col" className="text-right">
            Билетов
          </th>
          <th scope="col" className="text-right">
            Выручка
          </th>
          <th scope="col" className="text-right">
            Средний чек
          </th>
          <th scope="col" className="text-right">
            Макс. чек
          </th>
        </tr>
      </thead>
      <tbody>
        {routes.slice(0, ROUTES_SHOWN).map((route) => (
          <tr key={`${route.origin}-${route.destination}`}>
            <td className="whitespace-nowrap">
              {route.origin} → {route.destination}
            </td>
            {cells(route)}
          </tr>
        ))}
      </tbody>
      <tfoot className="font-semibold">
        <tr>
          <td>Итого по всем маршрутам</td>
          {cells(totals)}
        </tr>
      </tfoot>
    </Table>
  );
}
