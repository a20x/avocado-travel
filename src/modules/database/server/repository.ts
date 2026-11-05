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
  AirlineOption,
  AirlineRow,
  DbPassport,
  DirectoryAirlineRow,
  DirectoryCityRow,
  FlightRow,
  FlightSort,
  MonthRow,
  FlightCombo,
  RatingRow,
  RouteRow,
  SalesSpan,
  ScheduleRow,
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

/**
 * Варианты «Поиска по одному атрибуту»: авиакомпании из таблицы рейсов (а не из справочника),
 * у которых есть рейсы с `since`, без повторов. Новая авиакомпания попадает сюда с первым рейсом.
 */
export function listFlightAirlines(since: Date): Promise<Executed<AirlineOption>> {
  return run(
    db
      .selectDistinct({ code: airlines.code, name: airlines.name })
      .from(flights)
      .innerJoin(airlines, eq(airlines.id, flights.airlineId))
      .where(gte(flights.departsAt, since))
      .orderBy(asc(airlines.name)),
  );
}

/** День вылета по Москве — как его понимают даты формы. */
const departureDay = sql<string>`to_char(${flights.departsAt} at time zone 'Europe/Moscow', 'YYYY-MM-DD')`;

/**
 * Сочетания «откуда — куда — авиакомпания», для которых есть рейсы, с первым и последним днём
 * вылета и днями недели (по Москве): для связанных списков и подсказки о датах.
 */
export function listFlightCombos(): Promise<FlightCombo[]> {
  return db
    .select({
      from: origin.citySlug,
      to: destination.citySlug,
      airline: airlines.code,
      first: sql<string>`min(${departureDay})`,
      last: sql<string>`max(${departureDay})`,
      weekdays: sql<
        number[]
      >`array_agg(distinct extract(isodow from ${flights.departsAt} at time zone 'Europe/Moscow')::int)`,
    })
    .from(flights)
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .innerJoin(origin, eq(origin.id, flights.originId))
    .innerJoin(destination, eq(destination.id, flights.destinationId))
    .groupBy(origin.citySlug, destination.citySlug, airlines.code);
}

/**
 * Дни с рейсами по тем же условиям, но вне выбранных дат: до трёх ближайших до `before`
 * и после `after`. Нужны, когда в выбранные даты ничего не нашлось.
 */
export async function findFlightDays(
  filter: Omit<FlightFilter, 'range'>,
  around: { before?: Date; after?: Date },
): Promise<string[]> {
  const days = (when: SQL, order: SQL) =>
    db
      .selectDistinct({ day: departureDay })
      .from(flights)
      .innerJoin(airlines, eq(airlines.id, flights.airlineId))
      .innerJoin(origin, eq(origin.id, flights.originId))
      .innerJoin(destination, eq(destination.id, flights.destinationId))
      .where(and(flightWhere({ ...filter, range: {} }), when))
      .orderBy(order)
      .limit(3);
  const [before, after] = await Promise.all([
    around.before ? days(lt(flights.departsAt, around.before), sql`1 desc`) : [],
    around.after ? days(gte(flights.departsAt, around.after), sql`1`) : [],
  ]);
  return [...before, ...after].map((row) => row.day);
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

/** Единичные сочетания значений справочника городов — для связанных списков поиска. */
export function listDirectoryCities() {
  return run(
    db
      .selectDistinct({
        country: cities.country,
        city: cities.slug,
        name: cities.name,
        part: cities.worldPart,
        zone: airports.timezone,
      })
      .from(cities)
      .innerJoin(airports, eq(airports.citySlug, cities.slug)),
  );
}

/** Поиск по справочнику городов: город, страна, часть света, его аэропорты и часовые пояса. */
export function findDirectoryCities(filter: {
  country?: string;
  city?: string;
  part?: string;
  zone?: string;
}): Promise<Executed<DirectoryCityRow>> {
  return run(
    db
      .select({
        city: cities.name,
        country: cities.country,
        part: cities.worldPart,
        airports: sql<string>`string_agg(distinct ${airports.iata}::text, ', ')`,
        zones: sql<string>`string_agg(distinct ${airports.timezone}, ', ')`,
      })
      .from(cities)
      .innerJoin(airports, eq(airports.citySlug, cities.slug))
      .where(
        and(
          filter.country ? eq(cities.country, filter.country) : undefined,
          filter.city ? eq(cities.slug, filter.city) : undefined,
          filter.part ? eq(cities.worldPart, filter.part) : undefined,
          filter.zone ? eq(airports.timezone, filter.zone) : undefined,
        ),
      )
      .groupBy(cities.name, cities.country, cities.worldPart)
      .orderBy(asc(cities.name)),
  );
}

/** Единичные сочетания значений справочника авиакомпаний — для связанных списков поиска. */
export function listDirectoryAirlines() {
  return run(
    db
      .selectDistinct({
        country: airlines.country,
        airline: airlines.code,
        name: airlines.name,
        type: airlines.carrierType,
      })
      .from(airlines),
  );
}

/** Поиск по справочнику авиакомпаний: страна, тип, базовый город и багаж. */
export function findDirectoryAirlines(filter: {
  country?: string;
  airline?: string;
  type?: string;
}): Promise<Executed<DirectoryAirlineRow>> {
  return run(
    db
      .select({
        airline: airlines.name,
        code: airlines.code,
        country: airlines.country,
        type: airlines.carrierType,
        baseCity: cities.name,
        baggageIncluded: airlines.baggageIncluded,
      })
      .from(airlines)
      .innerJoin(cities, eq(cities.slug, airlines.baseCitySlug))
      .where(
        and(
          filter.country ? eq(airlines.country, filter.country) : undefined,
          filter.airline ? eq(airlines.code, filter.airline) : undefined,
          filter.type ? eq(airlines.carrierType, filter.type) : undefined,
        ),
      )
      .orderBy(asc(airlines.name)),
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

/**
 * Рейсы по авиакомпаниям: COUNT рейсов (всего и с `now`), COUNT DISTINCT маршрутов, MIN, AVG,
 * MAX цены эконома. LEFT JOIN от справочника: авиакомпания без рейсов — строка с нулями,
 * и после ввода рейсов её числа сразу растут.
 */
export async function summarizeSchedule(now: Date): Promise<Executed<ScheduleRow>> {
  const flightCount = count(flights.id);
  return run(
    db
      .select({
        airline: airlines.name,
        flights: flightCount,
        upcoming: num(sql`count(${flights.id}) filter (where ${flights.departsAt} >= ${now})`),
        routes: num(sql`count(distinct (${flights.originId}, ${flights.destinationId}))`),
        minPrice: num(sql`${min(flights.priceEconomy)}`),
        avgPrice: num(sql`round(${avg(flights.priceEconomy)})`),
        maxPrice: num(sql`${max(flights.priceEconomy)}`),
      })
      .from(airlines)
      .leftJoin(flights, eq(flights.airlineId, airlines.id))
      .groupBy(airlines.name)
      .orderBy(desc(flightCount), asc(airlines.name)),
  );
}

/** Продажи по авиакомпаниям: COUNT, SUM, AVG, MAX по оплаченным билетам. */
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

/** День оформления заказа по Москве — как его понимают даты формы сводок. */
const orderDay = sql<string>`to_char(${orders.createdAt} at time zone 'Europe/Moscow', 'YYYY-MM-DD')`;

/**
 * Первый и последний день продаж каждой авиакомпании (оплаченные действующие билеты): границы
 * календаря в сводках, чтобы нельзя было выбрать период без продаж.
 */
export function listSalesSpans(): Promise<SalesSpan[]> {
  return db
    .select({
      airline: airlines.code,
      first: sql<string>`min(${orderDay})`,
      last: sql<string>`max(${orderDay})`,
    })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .innerJoin(flights, eq(flights.id, tickets.flightId))
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .where(paidTicketsWhere({}))
    .groupBy(airlines.code);
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
