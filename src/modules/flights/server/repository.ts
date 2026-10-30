import 'server-only';
import { and, count, countDistinct, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { orders, ticketHoldsSeat, tickets } from '@/modules/booking';
import {
  aircraftModels,
  airlines,
  airports,
  cities,
  type CabinClass,
} from '@/modules/catalog-data';
import { db } from '@/server/db';
import { flights } from '../schema';
import type { RouteStatRow } from '../routes';
import type { SearchRoute } from '../model';
import type { FlightRow } from '../search';

// Таблица аэропортов нужна дважды — для вылета и прилёта, поэтому у каждой копии своё имя.
const origin = alias(airports, 'origin');
const destination = alias(airports, 'destination');
// Названия городов — в таблице cities, аэропорт ссылается на неё по city_slug.
const originCity = alias(cities, 'origin_city');
const destinationCity = alias(cities, 'destination_city');

type CandidateFilter = {
  originCitySlug: string;
  destinationCitySlug: string;
  /** Промежуток времени вылета в UTC: [from, to). */
  from: Date;
  to: Date;
};

// Рейс вместе со справочниками — одинаково для поиска и страницы рейса.
const flightColumns = {
  id: flights.id,
  number: flights.number,
  departsAt: flights.departsAt,
  arrivesAt: flights.arrivesAt,
  priceEconomy: flights.priceEconomy,
  priceBusiness: flights.priceBusiness,
  airline: {
    code: airlines.code,
    name: airlines.name,
    logo: airlines.logo,
    color: airlines.color,
    baggageIncluded: airlines.baggageIncluded,
  },
  aircraft: { manufacturer: aircraftModels.manufacturer, model: aircraftModels.model },
  layout: {
    businessRows: aircraftModels.businessRows,
    businessLayout: aircraftModels.businessLayout,
    economyRows: aircraftModels.economyRows,
    economyLayout: aircraftModels.economyLayout,
  },
  origin: {
    iata: origin.iata,
    name: origin.name,
    city: originCity.name,
    citySlug: origin.citySlug,
    timezone: origin.timezone,
  },
  destination: {
    iata: destination.iata,
    name: destination.name,
    city: destinationCity.name,
    citySlug: destination.citySlug,
    timezone: destination.timezone,
  },
};

function selectFlights() {
  return db
    .select(flightColumns)
    .from(flights)
    .innerJoin(airlines, eq(flights.airlineId, airlines.id))
    .innerJoin(aircraftModels, eq(flights.aircraftModelId, aircraftModels.id))
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .innerJoin(originCity, eq(originCity.slug, origin.citySlug))
    .innerJoin(destinationCity, eq(destinationCity.slug, destination.citySlug));
}

/** Рейсы между городами в промежутке времени, вместе с авиакомпанией, самолётом и аэропортами. */
export function findFlightCandidates(filter: CandidateFilter): Promise<FlightRow[]> {
  return selectFlights().where(
    and(
      eq(origin.citySlug, filter.originCitySlug),
      eq(destination.citySlug, filter.destinationCitySlug),
      gte(flights.departsAt, filter.from),
      lt(flights.departsAt, filter.to),
    ),
  );
}

/** Все рейсы с вылетом в промежутке [from, to) — по времени вылета, для выгрузки расписания. */
export function findFlightsDeparting(from: Date, to: Date): Promise<FlightRow[]> {
  return selectFlights()
    .where(and(gte(flights.departsAt, from), lt(flights.departsAt, to)))
    .orderBy(flights.departsAt, flights.number);
}

/** Рейс по id или undefined. */
export async function findFlightById(id: string): Promise<FlightRow | undefined> {
  const [row] = await selectFlights().where(eq(flights.id, id));
  return row;
}

type RouteStatFilter = {
  /** Только рейсы из этого города и (или) в этот город; без них — вся сеть. */
  originCitySlug?: string;
  destinationCitySlug?: string;
  from: Date;
  to: Date;
};

/** Рейсы за промежуток, сгруппированные по маршруту, авиакомпании и модели самолёта. */
export function findRouteStats(filter: RouteStatFilter): Promise<RouteStatRow[]> {
  return db
    .select({
      originSlug: origin.citySlug,
      originCity: originCity.name,
      destinationSlug: destination.citySlug,
      destinationCity: destinationCity.name,
      airlineCode: airlines.code,
      airlineName: airlines.name,
      manufacturer: aircraftModels.manufacturer,
      model: aircraftModels.model,
      flights: count(),
      minPrice: sql<number>`min(${flights.priceEconomy})`.mapWith(Number),
      durationMinutes:
        sql<number>`min(extract(epoch from ${flights.arrivesAt} - ${flights.departsAt}))::int / 60`.mapWith(
          Number,
        ),
    })
    .from(flights)
    .innerJoin(airlines, eq(flights.airlineId, airlines.id))
    .innerJoin(aircraftModels, eq(flights.aircraftModelId, aircraftModels.id))
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .innerJoin(originCity, eq(originCity.slug, origin.citySlug))
    .innerJoin(destinationCity, eq(destinationCity.slug, destination.citySlug))
    .where(
      and(
        filter.originCitySlug ? eq(origin.citySlug, filter.originCitySlug) : undefined,
        filter.destinationCitySlug
          ? eq(destination.citySlug, filter.destinationCitySlug)
          : undefined,
        gte(flights.departsAt, filter.from),
        lt(flights.departsAt, filter.to),
      ),
    )
    .groupBy(
      origin.citySlug,
      originCity.name,
      destination.citySlug,
      destinationCity.name,
      airlines.code,
      airlines.name,
      aircraftModels.manufacturer,
      aircraftModels.model,
    );
}

/*
 * Занятость мест. Билеты — таблицы модуля booking: здесь их только читают (ADR-0007),
 * а условие «билет держит место» берут у владельца, чтобы правило было одно на весь сайт.
 */

/** Занятые места рейса. */
export async function findTakenSeats(flightId: string, now: Date): Promise<string[]> {
  const rows = await db
    .select({ seat: tickets.seat })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(and(eq(tickets.flightId, flightId), ticketHoldsSeat(now)));
  return rows.map((row) => row.seat);
}

/** Сколько мест занято в классе на каждом из рейсов: id рейса → число. */
export async function countTakenSeats(
  flightIds: string[],
  cabinClass: CabinClass,
  now: Date,
): Promise<Map<string, number>> {
  if (flightIds.length === 0) return new Map();
  const rows = await db
    .select({ flightId: tickets.flightId, taken: count() })
    .from(tickets)
    .innerJoin(orders, eq(tickets.orderId, orders.id))
    .where(
      and(
        inArray(tickets.flightId, flightIds),
        eq(tickets.cabinClass, cabinClass),
        ticketHoldsSeat(now),
      ),
    )
    .groupBy(tickets.flightId);
  return new Map(rows.map((row) => [row.flightId, row.taken]));
}

/*
 * Рейсы, которые администратор заводит в админке, и их маршруты.
 */

type NewFlight = typeof flights.$inferInsert;

/** Номера рейсов авиакомпании — чтобы выдать следующий свободный. */
export async function findFlightNumbers(airlineId: number): Promise<string[]> {
  const rows = await db
    .selectDistinct({ number: flights.number })
    .from(flights)
    .where(eq(flights.airlineId, airlineId));
  return rows.map((row) => row.number);
}

export async function insertFlights(rows: NewFlight[]): Promise<void> {
  // Пачками: в одном запросе PostgreSQL принимает не больше 65 535 параметров.
  await db.transaction(async (tx) => {
    for (let i = 0; i < rows.length; i += 1000) {
      await tx.insert(flights).values(rows.slice(i, i + 1000));
    }
  });
}

/** Билетов на каждом рейсе — любых, и отменённых: на них ссылаются заказы. */
const ticketsByFlight = db
  .select({ flightId: tickets.flightId, tickets: count().as('tickets') })
  .from(tickets)
  .groupBy(tickets.flightId)
  .as('tickets_by_flight');

export type AdminRouteFilter = { city?: string; airline?: string };

/** Маршруты «авиакомпания: аэропорт → аэропорт»: число рейсов, период, проданные билеты. */
export function findAdminRoutes(filter: AdminRouteFilter) {
  return db
    .select({
      airlineCode: airlines.code,
      airlineName: airlines.name,
      originIata: origin.iata,
      originCity: originCity.name,
      destinationIata: destination.iata,
      destinationCity: destinationCity.name,
      flights: count(),
      first: sql<Date>`min(${flights.departsAt})`.mapWith(flights.departsAt),
      last: sql<Date>`max(${flights.departsAt})`.mapWith(flights.departsAt),
      tickets: sql<number>`coalesce(sum(${ticketsByFlight.tickets}), 0)`.mapWith(Number),
    })
    .from(flights)
    .innerJoin(airlines, eq(flights.airlineId, airlines.id))
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .innerJoin(originCity, eq(originCity.slug, origin.citySlug))
    .innerJoin(destinationCity, eq(destinationCity.slug, destination.citySlug))
    .leftJoin(ticketsByFlight, eq(ticketsByFlight.flightId, flights.id))
    .where(
      and(
        filter.city
          ? or(eq(origin.citySlug, filter.city), eq(destination.citySlug, filter.city))
          : undefined,
        filter.airline ? eq(airlines.code, filter.airline) : undefined,
      ),
    )
    .groupBy(
      airlines.code,
      airlines.name,
      origin.iata,
      originCity.name,
      destination.iata,
      destinationCity.name,
    );
}

export type RouteKey = { airlineId: number; originId: number; destinationId: number };

function routeWhere(route: RouteKey) {
  return and(
    eq(flights.airlineId, route.airlineId),
    eq(flights.originId, route.originId),
    eq(flights.destinationId, route.destinationId),
  );
}

/** Рейсов маршрута и билетов на них. */
export async function countRoute(route: RouteKey): Promise<{ flights: number; tickets: number }> {
  const [row] = await db
    .select({
      flights: countDistinct(flights.id),
      tickets: count(tickets.id),
    })
    .from(flights)
    .leftJoin(tickets, eq(tickets.flightId, flights.id))
    .where(routeWhere(route));
  return row ?? { flights: 0, tickets: 0 };
}

/** Удаляет все рейсы маршрута; сколько удалено. Билетов на них быть не должно. */
export async function deleteRoute(route: RouteKey): Promise<number> {
  const deleted = await db.delete(flights).where(routeWhere(route)).returning({ id: flights.id });
  return deleted.length;
}

/*
 * Окно продажи для поиска-фразы: рейсы, которые ещё не улетели и вылетают не позже чем через
 * `daysAhead` дней по местному времени города вылета (как проверяет сам поиск).
 */

const localDeparture = sql`(${flights.departsAt} at time zone ${origin.timezone})`;
const localDay = sql<string>`to_char(${localDeparture}, 'YYYY-MM-DD')`;

function inSaleWindow(now: Date, daysAhead: number) {
  return and(
    gte(flights.departsAt, now),
    sql`${localDeparture}::date <= (${now.toISOString()}::timestamptz at time zone ${origin.timezone})::date + ${daysAhead}::int`,
  );
}

/** Направления с рейсами в окне продажи: первый и последний день и дни недели (местные). */
export function findSearchRoutes(now: Date, daysAhead: number): Promise<SearchRoute[]> {
  return db
    .select({
      from: origin.citySlug,
      to: destination.citySlug,
      first: sql<string>`min(${localDay})`,
      last: sql<string>`max(${localDay})`,
      weekdays: sql<number[]>`array_agg(distinct extract(isodow from ${localDeparture})::int)`,
    })
    .from(flights)
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .where(inSaleWindow(now, daysAhead))
    .groupBy(origin.citySlug, destination.citySlug);
}

/** Местные дни вылета рейсов между городами в окне продажи — для «ближайших дат». */
export async function findSearchDays(
  route: { from: string; to: string },
  now: Date,
  daysAhead: number,
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ day: localDay })
    .from(flights)
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .where(
      and(
        eq(origin.citySlug, route.from),
        eq(destination.citySlug, route.to),
        inSaleWindow(now, daysAhead),
      ),
    );
  return rows.map((row) => row.day);
}
