import 'server-only';
import {
  and,
  asc,
  avg,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  lt,
  max,
  min,
  sql,
  sum,
  type SQL,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { orders, tickets } from '@/modules/booking';
import { aircraftModels, airlines, airports, cities } from '@/modules/catalog-data';
import { flights } from '@/modules/flights';
import { forumTopics } from '@/modules/forum';
import { news } from '@/modules/news';
import { siteRatings } from '@/modules/rating';
import { pageViews } from '@/modules/stats';
import { db } from '@/server/db';
import type {
  AirlineRow,
  DbPassport,
  FlightRow,
  FlightSort,
  MonthRow,
  RatingRow,
  RouteRow,
  RoutePair,
  SqlText,
} from '../model';

/**
 * Запросы вкладки «БД» (лаба 3). Таблицы рейсов, заказов и справочников — чужие, их можно
 * читать в своём репозитории (ADR-0007); вкладка ничего не меняет. Каждый запрос возвращает
 * и строки, и свой текст SQL (`toSQL()` Drizzle) — его страница показывает под результатом.
 * Значения из формы уходят в базу параметрами $1, $2…, а не вставляются в текст запроса.
 */

/** Период в UTC: [начало первого дня; начало дня после последнего) по Москве. */
export type Range = { start?: Date; end?: Date };

const origin = alias(airports, 'origin');
const destination = alias(airports, 'destination');
// Названия городов — в таблице cities, аэропорт ссылается на неё по city_slug.
const originCity = alias(cities, 'origin_city');
const destinationCity = alias(cities, 'destination_city');
const num = (query: SQL) => sql`coalesce(${query}, 0)`.mapWith(Number);
const isPaid = eq(orders.status, 'paid');

type Executed<T> = { rows: T[]; sql: SqlText };

async function run<T>(query: { toSQL(): SqlText } & PromiseLike<T[]>): Promise<Executed<T>> {
  const { sql: text, params } = query.toSQL();
  return { rows: await query, sql: { sql: text, params } };
}

/** Продано мест на каждом рейсе: действующие билеты не отменённых заказов. */
const soldByFlight = db
  .select({ flightId: tickets.flightId, sold: count().as('sold') })
  .from(tickets)
  .where(eq(tickets.isActive, true))
  .groupBy(tickets.flightId)
  .as('sold_by_flight');

export type FlightFilter = {
  from?: string;
  to?: string;
  airline?: string;
  range: Range;
};

function flightWhere(filter: FlightFilter) {
  return and(
    filter.from ? eq(origin.citySlug, filter.from) : undefined,
    filter.to ? eq(destination.citySlug, filter.to) : undefined,
    filter.airline ? eq(airlines.code, filter.airline) : undefined,
    filter.range.start ? gte(flights.departsAt, filter.range.start) : undefined,
    filter.range.end ? lt(flights.departsAt, filter.range.end) : undefined,
  );
}

const FLIGHT_ORDER: Record<FlightSort, SQL[]> = {
  departure: [asc(flights.departsAt)],
  'price-asc': [asc(flights.priceEconomy), asc(flights.departsAt)],
  'price-desc': [desc(flights.priceEconomy), asc(flights.departsAt)],
  sold: [desc(sql`coalesce(${soldByFlight.sold}, 0)`), asc(flights.departsAt)],
};

/** 1. Поиск рейсов: выборка с условиями, сортировкой и постраничным выводом. */
export async function searchFlights(
  filter: FlightFilter,
  sort: FlightSort,
  paging: { limit: number; offset: number },
): Promise<{ rows: FlightRow[]; total: number; sql: SqlText[] }> {
  const where = flightWhere(filter);
  const rowsQuery = db
    .select({
      id: flights.id,
      number: flights.number,
      departsAt: flights.departsAt,
      origin: originCity.name,
      destination: destinationCity.name,
      airline: airlines.name,
      aircraft: sql<string>`${aircraftModels.manufacturer} || ' ' || ${aircraftModels.model}`,
      priceEconomy: flights.priceEconomy,
      priceBusiness: flights.priceBusiness,
      sold: num(sql`${soldByFlight.sold}`),
    })
    .from(flights)
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(aircraftModels, eq(aircraftModels.id, flights.aircraftModelId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .innerJoin(originCity, eq(originCity.slug, origin.citySlug))
    .innerJoin(destinationCity, eq(destinationCity.slug, destination.citySlug))
    .leftJoin(soldByFlight, eq(soldByFlight.flightId, flights.id))
    .where(where)
    .orderBy(...FLIGHT_ORDER[sort])
    .limit(paging.limit)
    .offset(paging.offset);
  const totalQuery = db
    .select({ total: count() })
    .from(flights)
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .where(where);

  const [rows, totals] = await Promise.all([run(rowsQuery), run(totalQuery)]);
  return { rows: rows.rows, total: totals.rows[0]?.total ?? 0, sql: [rows.sql, totals.sql] };
}

/** Сочетания «авиакомпания — город прилёта», для которых есть рейсы: для связанных списков. */
export async function listRoutePairs(): Promise<RoutePair[]> {
  return db
    .selectDistinct({ airline: airlines.code, destination: destination.citySlug })
    .from(flights)
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(destination, eq(destination.id, flights.destinationId));
}

/** 2. Маршруты авиакомпании в город: число рейсов, цены эконома MIN/AVG/MAX, продано мест. */
export async function findRoutes(filter: {
  airline?: string;
  to?: string;
}): Promise<Executed<RouteRow>> {
  return run(
    db
      .select({
        origin: originCity.name,
        destination: destinationCity.name,
        flights: count(),
        minPrice: num(sql`${min(flights.priceEconomy)}`),
        avgPrice: num(sql`round(${avg(flights.priceEconomy)})`),
        maxPrice: num(sql`${max(flights.priceEconomy)}`),
        sold: num(sql`${sum(soldByFlight.sold)}`),
      })
      .from(flights)
      .innerJoin(airlines, eq(airlines.id, flights.airlineId))
      .innerJoin(origin, eq(origin.id, flights.originId))
      .innerJoin(destination, eq(destination.id, flights.destinationId))
      .innerJoin(originCity, eq(originCity.slug, origin.citySlug))
      .innerJoin(destinationCity, eq(destinationCity.slug, destination.citySlug))
      .leftJoin(soldByFlight, eq(soldByFlight.flightId, flights.id))
      .where(
        and(
          filter.airline ? eq(airlines.code, filter.airline) : undefined,
          filter.to ? eq(destination.citySlug, filter.to) : undefined,
        ),
      )
      .groupBy(originCity.name, destinationCity.name)
      .orderBy(desc(count()), asc(originCity.name), asc(destinationCity.name)),
  );
}

/** Оплаченные билеты периода (по дате оформления заказа) — основа двух сводок. */
function paidTicketsWhere(range: Range, extra?: SQL) {
  return and(
    isPaid,
    eq(tickets.isActive, true),
    range.start ? gte(orders.createdAt, range.start) : undefined,
    range.end ? lt(orders.createdAt, range.end) : undefined,
    extra,
  );
}

/** 3. Сводка по авиакомпаниям: COUNT, SUM, AVG, MAX по оплаченным билетам. */
export async function summarizeAirlines(range: Range): Promise<Executed<AirlineRow>> {
  return run(
    db
      .select({
        airline: airlines.name,
        orders: countDistinct(orders.id),
        tickets: count(),
        revenue: num(sql`${sum(tickets.price)}`),
        averagePrice: num(sql`round(${avg(tickets.price)})`),
        maxPrice: num(sql`${max(tickets.price)}`),
      })
      .from(tickets)
      .innerJoin(orders, eq(orders.id, tickets.orderId))
      .innerJoin(flights, eq(flights.id, tickets.flightId))
      .innerJoin(airlines, eq(airlines.id, flights.airlineId))
      .where(paidTicketsWhere(range))
      .groupBy(airlines.name)
      .orderBy(desc(sum(tickets.price))),
  );
}

/** 4. Динамика продаж: заказы, билеты и выручка по месяцам (месяц — по Москве). */
export async function summarizeMonths(range: Range, airline?: string): Promise<Executed<MonthRow>> {
  const month = sql<string>`to_char(${orders.createdAt} at time zone 'Europe/Moscow', 'YYYY-MM')`;
  return run(
    db
      .select({
        month,
        orders: countDistinct(orders.id),
        tickets: count(),
        revenue: num(sql`${sum(tickets.price)}`),
      })
      .from(tickets)
      .innerJoin(orders, eq(orders.id, tickets.orderId))
      .innerJoin(flights, eq(flights.id, tickets.flightId))
      .innerJoin(airlines, eq(airlines.id, flights.airlineId))
      .where(paidTicketsWhere(range, airline ? eq(airlines.code, airline) : undefined))
      .groupBy(month)
      .orderBy(month),
  );
}

/** 5. Распределение оценок сайта и итоги: средняя, минимальная, максимальная. */
export async function summarizeRatings(): Promise<{
  rows: RatingRow[];
  summary: { total: number; average: number; min: number; max: number };
  sql: SqlText[];
}> {
  const [distribution, totals] = await Promise.all([
    run(
      db
        .select({ score: siteRatings.score, count: count() })
        .from(siteRatings)
        .groupBy(siteRatings.score)
        .orderBy(asc(siteRatings.score)),
    ),
    run(
      db
        .select({
          total: count(),
          average: num(sql`round(${avg(siteRatings.score)}, 2)`),
          min: num(sql`${min(siteRatings.score)}`),
          max: num(sql`${max(siteRatings.score)}`),
        })
        .from(siteRatings),
    ),
  ]);
  return {
    rows: distribution.rows,
    summary: totals.rows[0] ?? { total: 0, average: 0, min: 0, max: 0 },
    sql: [distribution.sql, totals.sql],
  };
}

/** Паспорт базы: объём, число таблиц, записи основных таблиц, полнота и свежесть данных. */
export async function readPassport(): Promise<DbPassport> {
  const countOf = (table: Parameters<typeof db.$count>[0]) => db.$count(table);
  const [
    [size],
    [tables],
    flightsCount,
    ordersCount,
    ticketsCount,
    airlinesCount,
    citiesCount,
    airportsCount,
    newsCount,
    topicsCount,
    ratingsCount,
    viewsCount,
    [fill],
    [withTickets],
    [freshness],
  ] = await Promise.all([
    db
      .execute<{ bytes: string }>(sql`select pg_database_size(current_database()) as bytes`)
      .then((result) => result.rows),
    db
      .execute<{ total: string }>(
        sql`select count(*) as total from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
      )
      .then((result) => result.rows),
    countOf(flights),
    countOf(orders),
    countOf(tickets),
    countOf(airlines),
    countOf(cities),
    countOf(airports),
    countOf(news),
    countOf(forumTopics),
    countOf(siteRatings),
    countOf(pageViews),
    db
      .select({
        paidOrders: sql`count(*) filter (where ${isPaid})`.mapWith(Number),
        paidWithDate:
          sql`count(*) filter (where ${isPaid} and ${orders.paidAt} is not null)`.mapWith(Number),
        lastOrderAt: max(orders.createdAt),
      })
      .from(orders),
    db.select({ orders: countDistinct(tickets.orderId) }).from(tickets),
    db
      .select({
        scheduleFrom: min(flights.departsAt),
        scheduleTo: max(flights.departsAt),
        lastNewsAt:
          sql<Date | null>`(select max(${news.publishedAt}) from ${news} where ${news.source} = 'site' and ${news.publishedAt} <= now())`.mapWith(
            (value: string | null) => (value ? new Date(value) : null),
          ),
      })
      .from(flights),
  ]);

  return {
    sizeBytes: Number(size?.bytes ?? 0),
    tables: Number(tables?.total ?? 0),
    counts: {
      flights: flightsCount,
      orders: ordersCount,
      tickets: ticketsCount,
      airlines: airlinesCount,
      cities: citiesCount,
      airports: airportsCount,
      news: newsCount,
      forumTopics: topicsCount,
      ratings: ratingsCount,
      pageViews: viewsCount,
    },
    ordersWithTickets: withTickets?.orders ?? 0,
    paidOrders: fill?.paidOrders ?? 0,
    paidWithDate: fill?.paidWithDate ?? 0,
    lastOrderAt: fill?.lastOrderAt ?? null,
    lastNewsAt: freshness?.lastNewsAt ?? null,
    scheduleFrom: freshness?.scheduleFrom ?? null,
    scheduleTo: freshness?.scheduleTo ?? null,
  };
}
