import 'server-only';
import { and, count, countDistinct, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { orders, tickets } from '@/modules/booking';
import { aircraftModels, airlines, airports } from '@/modules/catalog-data';
import { flights } from '@/modules/flights';
import { db } from '@/server/db';
import type { RouteSales, SalesTotals } from '../model';

/**
 * Запросы отчётов (лаба 3). Таблицы заказов, рейсов и справочников — чужие, их можно
 * читать в своём репозитории (ADR-0007). Все суммы — копейки, все отчёты — только чтение.
 */

/** Период в UTC: [начало первого дня; начало дня после последнего) по Москве. */
export type Range = { start: Date; end: Date };
export type Scope = { range: Range; airline?: string; destination?: string };

const origin = alias(airports, 'origin');
const destination = alias(airports, 'destination');

/** Рейс заказа: все билеты заказа — на одном рейсе, берём рейс первого билета и число билетов. */
const orderFlight = db
  .select({
    orderId: tickets.orderId,
    flightId: sql<string>`(array_agg(${tickets.flightId}))[1]`.as('flight_id'),
    tickets: sql<number>`count(*)::int`.as('tickets'),
  })
  .from(tickets)
  .groupBy(tickets.orderId)
  .as('order_flight');

const isPaid = eq(orders.status, 'paid');
const num = (query: SQL) => sql`coalesce(${query}, 0)`.mapWith(Number);

/** Фильтры по авиакомпании и городу прилёта — к запросам, где присоединены рейс и справочники. */
function scopeFilters(scope: Scope): Array<SQL | undefined> {
  return [
    scope.airline ? eq(airlines.code, scope.airline) : undefined,
    scope.destination ? eq(destination.citySlug, scope.destination) : undefined,
  ];
}

/** Заказы периода (по дате оформления) — условие к запросам от `orders` с рейсом заказа. */
function ordersWhere(scope: Scope, extra?: SQL) {
  return and(
    gte(orders.createdAt, scope.range.start),
    lt(orders.createdAt, scope.range.end),
    extra,
    ...scopeFilters(scope),
  );
}

const salesColumns = {
  orders: count(),
  tickets: num(sql`sum(${orderFlight.tickets})`),
  revenue: num(sql`sum(${orders.total})`),
  averageCheck: num(sql`round(avg(${orders.total}))`),
  maxCheck: num(sql`max(${orders.total})`),
};

/** Итоги периода: COUNT, SUM, AVG, MAX по оплаченным заказам и число отмен. */
export async function findTotals(scope: Scope): Promise<SalesTotals & { cancelled: number }> {
  const paid = sql`filter (where ${isPaid})`;
  const [row] = await db
    .select({
      orders: sql`count(*) ${paid}`.mapWith(Number),
      tickets: num(sql`sum(${orderFlight.tickets}) ${paid}`),
      revenue: num(sql`sum(${orders.total}) ${paid}`),
      averageCheck: num(sql`round(avg(${orders.total}) ${paid})`),
      maxCheck: num(sql`max(${orders.total}) ${paid}`),
      cancelled: sql`count(*) filter (where ${eq(orders.status, 'cancelled')})`.mapWith(Number),
    })
    .from(orders)
    .innerJoin(orderFlight, eq(orderFlight.orderId, orders.id))
    .innerJoin(flights, eq(flights.id, orderFlight.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(ordersWhere(scope));
  return row ?? { orders: 0, tickets: 0, revenue: 0, averageCheck: 0, maxCheck: 0, cancelled: 0 };
}

/** Выручка и число оплаченных заказов по месяцам оформления (по Москве). */
export function findRevenueByMonth(
  scope: Scope,
): Promise<Array<{ month: string; revenue: number; orders: number }>> {
  const month = sql<string>`to_char(${orders.createdAt} at time zone 'Europe/Moscow', 'YYYY-MM')`;
  return db
    .select({ month, revenue: salesColumns.revenue, orders: count() })
    .from(orders)
    .innerJoin(orderFlight, eq(orderFlight.orderId, orders.id))
    .innerJoin(flights, eq(flights.id, orderFlight.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(ordersWhere(scope, isPaid))
    .groupBy(month)
    .orderBy(month);
}

/** Заказы по статусам: оплачен, отменён, ждёт оплаты. */
export function findStatusCounts(scope: Scope): Promise<Array<{ status: string; orders: number }>> {
  return db
    .select({ status: orders.status, orders: count() })
    .from(orders)
    .innerJoin(orderFlight, eq(orderFlight.orderId, orders.id))
    .innerJoin(flights, eq(flights.id, orderFlight.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(ordersWhere(scope))
    .groupBy(orders.status);
}

/** Продажи по маршрутам «откуда → куда», самые доходные сверху. */
export function findRouteSales(scope: Scope): Promise<RouteSales[]> {
  return db
    .select({ origin: origin.city, destination: destination.city, ...salesColumns })
    .from(orders)
    .innerJoin(orderFlight, eq(orderFlight.orderId, orders.id))
    .innerJoin(flights, eq(flights.id, orderFlight.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(ordersWhere(scope, isPaid))
    .groupBy(origin.city, destination.city)
    .orderBy(desc(sql`sum(${orders.total})`), origin.city, destination.city);
}

/** Билеты оплаченных заказов периода — условие к запросам от `tickets` с рейсом. */
function ticketsWhere(scope: Scope) {
  return and(
    isPaid,
    gte(orders.createdAt, scope.range.start),
    lt(orders.createdAt, scope.range.end),
    ...scopeFilters(scope),
  );
}

/** Города прилёта по числу проданных билетов. */
export function findTopDestinations(
  scope: Scope,
  limit: number,
): Promise<Array<{ label: string; tickets: number }>> {
  return db
    .select({ label: destination.city, tickets: count() })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .innerJoin(flights, eq(flights.id, tickets.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(ticketsWhere(scope))
    .groupBy(destination.city)
    .orderBy(desc(count()), destination.city)
    .limit(limit);
}

/** Билеты по классам обслуживания. */
export function findClassCounts(
  scope: Scope,
): Promise<Array<{ cabinClass: string; tickets: number }>> {
  return db
    .select({ cabinClass: tickets.cabinClass, tickets: count() })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .innerJoin(flights, eq(flights.id, tickets.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(ticketsWhere(scope))
    .groupBy(tickets.cabinClass);
}

/**
 * Улетевшие рейсы периода (по дате вылета) и проданные на них места — по парам
 * «авиакомпания + модель самолёта». Вместимость считает сервис по схеме салона модели.
 */
export function findFlightLoad(scope: Scope, now: Date) {
  const soldTicket = and(eq(tickets.flightId, flights.id), eq(tickets.isActive, true));
  return db
    .select({
      airline: airlines.name,
      model: sql<string>`${aircraftModels.manufacturer} || ' ' || ${aircraftModels.model}`,
      businessRows: aircraftModels.businessRows,
      businessLayout: aircraftModels.businessLayout,
      economyRows: aircraftModels.economyRows,
      economyLayout: aircraftModels.economyLayout,
      flights: countDistinct(flights.id),
      sold: count(orders.id),
    })
    .from(flights)
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(aircraftModels, eq(aircraftModels.id, flights.aircraftModelId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .leftJoin(tickets, soldTicket)
    .leftJoin(orders, and(eq(orders.id, tickets.orderId), isPaid))
    .where(
      and(
        gte(flights.departsAt, scope.range.start),
        lt(flights.departsAt, scope.range.end),
        lt(flights.departsAt, now),
        ...scopeFilters(scope),
      ),
    )
    .groupBy(airlines.name, aircraftModels.id);
}
