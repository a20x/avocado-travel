import 'server-only';
import { groupCities, type City } from '../cities';
import type { AircraftModel, Airline, Airport } from '../model';
import * as repository from './repository';

// Справочники только читаются: бизнес-правил здесь пока нет, сервис — единая точка входа
// для страниц и других модулей, чтобы они не зависели от устройства репозитория.

export function listAirports(): Promise<Airport[]> {
  return repository.findAllAirports();
}

export function listAirportsInCity(citySlug: string): Promise<Airport[]> {
  return repository.findAirportsByCitySlug(citySlug);
}

/** Города, куда летаем, по алфавиту. */
export async function listCities(): Promise<City[]> {
  return groupCities(await repository.findAllAirports());
}

/** Город по адресу страницы или null, если такого нет. */
export async function getCity(citySlug: string): Promise<City | null> {
  const [city] = groupCities(await repository.findAirportsByCitySlug(citySlug));
  return city ?? null;
}

export function listAirlines(): Promise<Airline[]> {
  return repository.findAllAirlines();
}

export function listAircraftModels(): Promise<AircraftModel[]> {
  return repository.findAllAircraftModels();
}
