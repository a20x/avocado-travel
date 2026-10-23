import 'server-only';
import { seatCapacity } from '@/modules/catalog-data';
import { addDays, dateInZone, zonedTimeToUtc } from '@/shared/lib/time';
import {
  ANALYTICS_TIMEZONE,
  TOP_DESTINATIONS,
  fillMonths,
  occupancyBy,
  parseAnalyticsFilter,
  percent,
  sharesOf,
  type AnalyticsReport,
} from '../model';
import * as repository from './repository';

/**
 * Все отчёты страницы `/analytics` (лаба 3) по фильтрам из адреса: выручка по месяцам,
 * топ направлений, заполняемость, структура продаж и итоги по маршрутам.
 */
export async function getAnalytics(
  params: Record<string, unknown>,
  now: Date = new Date(),
): Promise<AnalyticsReport> {
  const filter = parseAnalyticsFilter(params, dateInZone(now, ANALYTICS_TIMEZONE));
  const scope = {
    range: {
      start: zonedTimeToUtc(filter.from, '00:00', ANALYTICS_TIMEZONE),
      end: zonedTimeToUtc(addDays(filter.to, 1), '00:00', ANALYTICS_TIMEZONE),
    },
    airline: filter.airline,
    destination: filter.destination,
  };

  const [totals, months, statuses, routes, destinations, classes, load] = await Promise.all([
    repository.findTotals(scope),
    repository.findRevenueByMonth(scope),
    repository.findStatusCounts(scope),
    repository.findRouteSales(scope),
    repository.findTopDestinations(scope, TOP_DESTINATIONS),
    repository.findClassCounts(scope),
    repository.findFlightLoad(scope, now),
  ]);

  const statusCount = (status: string) =>
    statuses.find((row) => row.status === status)?.orders ?? 0;
  const classCount = (cabinClass: string) =>
    classes.find((row) => row.cabinClass === cabinClass)?.tickets ?? 0;
  const loadRows = load.map((row) => {
    const capacity = seatCapacity(row);
    return { ...row, seatsPerFlight: capacity.business + capacity.economy };
  });
  const ordersAll = statuses.reduce((sum, row) => sum + row.orders, 0);

  return {
    filter,
    totals: { ...totals, cancelShare: percent(totals.cancelled, ordersAll) },
    revenueByMonth: fillMonths(filter, months),
    topDestinations: destinations,
    occupancyByAirline: occupancyBy(loadRows, (row) => row.airline),
    occupancyByModel: occupancyBy(loadRows, (row) => row.model),
    classShares: sharesOf([
      { key: 'economy', label: 'Эконом', value: classCount('economy') },
      { key: 'business', label: 'Бизнес', value: classCount('business') },
    ]),
    statusShares: sharesOf([
      { key: 'paid', label: 'Оплачены', value: statusCount('paid') },
      { key: 'cancelled', label: 'Отменены', value: statusCount('cancelled') },
      { key: 'pending', label: 'Ждут оплаты', value: statusCount('pending') },
      // Неоплаченные заказы бывают только «живые» и редко: долю меньше 0,1% не показываем.
    ]).filter((share) => share.key !== 'pending' || share.percent > 0),
    routes,
  };
}
