import 'server-only';
import { and, count, eq, gte, lt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { aircraftModels, airlines, airports } from '@/modules/catalog-data';
import { db } from '@/server/db';
import { flights } from '../schema';
import type { RouteStatRow } from '../routes';
import type { FlightRow } from '../search';

// Таблица аэропортов нужна дважды — для вылета и прилёта, поэтому у каждой копии своё имя.
const origin = alias(airports, 'origin');
const destination = alias(airports, 'destination');

type CandidateFilter = {
  originCitySlug: string;
  destinationCitySlug: string;
  /** Промежуток времени вылета в UTC: [from, to). */
  from: Date;
  to: Date;
};

/** Рейсы между городами в промежутке времени, вместе с авиакомпанией, самолётом и аэропортами. */
export function findFlightCandidates(filter: CandidateFilter): Promise<FlightRow[]> {
  return db
    .select({
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
        city: origin.city,
        timezone: origin.timezone,
      },
      destination: {
        iata: destination.iata,
        name: destination.name,
        city: destination.city,
        timezone: destination.timezone,
      },
    })
    .from(flights)
    .innerJoin(airlines, eq(flights.airlineId, airlines.id))
    .innerJoin(aircraftModels, eq(flights.aircraftModelId, aircraftModels.id))
    .innerJoin(origin, eq(flights.originId, origin.id))
    .innerJoin(destination, eq(flights.destinationId, destination.id))
    .where(
      and(
        eq(origin.citySlug, filter.originCitySlug),
        eq(destination.citySlug, filter.destinationCitySlug),
        gte(flights.departsAt, filter.from),
        lt(flights.departsAt, filter.to),
      ),
    );
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
      originCity: origin.city,
      destinationSlug: destination.citySlug,
      destinationCity: destination.city,
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
      origin.city,
      destination.citySlug,
      destination.city,
      airlines.code,
      airlines.name,
      aircraftModels.manufacturer,
      aircraftModels.model,
    );
}
