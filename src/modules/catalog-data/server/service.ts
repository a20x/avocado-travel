import 'server-only';
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

export function listAirlines(): Promise<Airline[]> {
  return repository.findAllAirlines();
}

export function listAircraftModels(): Promise<AircraftModel[]> {
  return repository.findAllAircraftModels();
}
