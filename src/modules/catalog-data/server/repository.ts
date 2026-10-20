import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { aircraftModels, airlines, airports } from '../schema';

export function findAllAirports() {
  return db.select().from(airports).orderBy(asc(airports.city), asc(airports.name));
}

export function findAirportsByCitySlug(citySlug: string) {
  return db
    .select()
    .from(airports)
    .where(eq(airports.citySlug, citySlug))
    .orderBy(asc(airports.name));
}

export function findAllAirlines() {
  return db.select().from(airlines).orderBy(asc(airlines.name));
}

export function findAllAircraftModels() {
  return db
    .select()
    .from(aircraftModels)
    .orderBy(asc(aircraftModels.manufacturer), asc(aircraftModels.model));
}
