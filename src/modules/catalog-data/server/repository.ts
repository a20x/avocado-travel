import 'server-only';
import { asc, count, countDistinct, eq, or, sql } from 'drizzle-orm';
import { flights } from '@/modules/flights';
import { db } from '@/server/db';
import type { Airport, CityInput } from '../model';
import { aircraftModels, airlines, airports, cities } from '../schema';

type NewCity = typeof cities.$inferInsert;
type NewAirport = typeof airports.$inferInsert;
type NewAirline = typeof airlines.$inferInsert;

// Названия городов и авиакомпаний сравниваются без учёта регистра: «казань» — та же Казань.
const sameText = (column: typeof cities.name | typeof airlines.name, value: string) =>
  sql`lower(${column}) = lower(${value})`;

/** Города по алфавиту. */
export function findAllCities() {
  return db.select().from(cities).orderBy(asc(cities.name));
}

export async function findCityBySlug(slug: string) {
  const [city] = await db.select().from(cities).where(eq(cities.slug, slug));
  return city;
}

export async function findCityByName(name: string) {
  const [city] = await db.select().from(cities).where(sameText(cities.name, name));
  return city;
}

// Аэропорт вместе с названием города и страной — как его видят страницы и API.
const airportColumns = {
  id: airports.id,
  iata: airports.iata,
  name: airports.name,
  city: cities.name,
  citySlug: airports.citySlug,
  country: cities.country,
  lat: airports.lat,
  lon: airports.lon,
  timezone: airports.timezone,
};

function selectAirports() {
  return db
    .select(airportColumns)
    .from(airports)
    .innerJoin(cities, eq(cities.slug, airports.citySlug));
}

/** Аэропорты по городам и названиям, по алфавиту. */
export function findAllAirports(): Promise<Airport[]> {
  return selectAirports().orderBy(asc(cities.name), asc(airports.name));
}

export function findAirportsByCitySlug(citySlug: string): Promise<Airport[]> {
  return selectAirports().where(eq(airports.citySlug, citySlug)).orderBy(asc(airports.name));
}

export async function findAirportByIata(iata: string) {
  const [airport] = await db.select().from(airports).where(eq(airports.iata, iata));
  return airport;
}

/** Новый город вместе с первым аэропортом — одной транзакцией. */
export function insertCity(city: NewCity, airport: Omit<NewAirport, 'citySlug'>) {
  return db.transaction(async (tx) => {
    await tx.insert(cities).values(city);
    await tx.insert(airports).values({ ...airport, citySlug: city.slug });
  });
}

export async function updateCity(slug: string, input: CityInput): Promise<boolean> {
  const updated = await db
    .update(cities)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(cities.slug, slug))
    .returning({ slug: cities.slug });
  return updated.length > 0;
}

/** Удаляет город с его аэропортами. Рейсов у аэропортов быть не должно — это проверяет сервис. */
export function deleteCity(slug: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.delete(airports).where(eq(airports.citySlug, slug));
    const deleted = await tx
      .delete(cities)
      .where(eq(cities.slug, slug))
      .returning({ slug: cities.slug });
    return deleted.length > 0;
  });
}

/** Рейсов из города и в город по каждому городу: slug → число рейсов. */
export async function countFlightsByCity(): Promise<Map<string, number>> {
  const rows = await db
    .select({ citySlug: airports.citySlug, flights: countDistinct(flights.id) })
    .from(airports)
    .innerJoin(
      flights,
      or(eq(flights.originId, airports.id), eq(flights.destinationId, airports.id)),
    )
    .groupBy(airports.citySlug);
  return new Map(rows.map((row) => [row.citySlug, row.flights]));
}

export async function countFlightsOfCity(slug: string): Promise<number> {
  const [row] = await db
    .select({ flights: count() })
    .from(flights)
    .innerJoin(
      airports,
      or(eq(flights.originId, airports.id), eq(flights.destinationId, airports.id)),
    )
    .where(eq(airports.citySlug, slug));
  return row?.flights ?? 0;
}

/** Авиакомпании по алфавиту. */
export function findAllAirlines() {
  return db.select().from(airlines).orderBy(asc(airlines.name));
}

export async function findAirlineByCode(code: string) {
  const [airline] = await db.select().from(airlines).where(eq(airlines.code, code));
  return airline;
}

export async function findAirlineByName(name: string) {
  const [airline] = await db.select().from(airlines).where(sameText(airlines.name, name));
  return airline;
}

export async function insertAirline(airline: NewAirline): Promise<void> {
  await db.insert(airlines).values(airline);
}

export async function updateAirline(
  code: string,
  values: Pick<NewAirline, 'name' | 'color' | 'description' | 'baggageIncluded'>,
): Promise<boolean> {
  const updated = await db
    .update(airlines)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(airlines.code, code))
    .returning({ code: airlines.code });
  return updated.length > 0;
}

export async function deleteAirline(code: string): Promise<boolean> {
  const deleted = await db
    .delete(airlines)
    .where(eq(airlines.code, code))
    .returning({ code: airlines.code });
  return deleted.length > 0;
}

/** Рейсов у каждой авиакомпании: код → число рейсов. */
export async function countFlightsByAirline(): Promise<Map<string, number>> {
  const rows = await db
    .select({ code: airlines.code, flights: count() })
    .from(flights)
    .innerJoin(airlines, eq(airlines.id, flights.airlineId))
    .groupBy(airlines.code);
  return new Map(rows.map((row) => [row.code, row.flights]));
}

export function findAllAircraftModels() {
  return db
    .select()
    .from(aircraftModels)
    .orderBy(asc(aircraftModels.manufacturer), asc(aircraftModels.model));
}
