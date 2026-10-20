/**
 * Модуль catalog-data: справочники аэропортов, авиакомпаний и моделей самолётов.
 * Снаружи модуля доступно только то, что экспортировано здесь.
 */

/** Таблицы публикуются для внешних ключей и чтения в чужих репозиториях (ADR-0007). */
export { aircraftModels, airlines, airports } from './schema';

export type { AircraftModel, Airline, Airport } from './model';

/** Схема салона и вместимость самолёта. */
export { buildCabin, listSeats, parseLayout, seatCapacity, seatClass } from './cabin';
export type { CabinClass, CabinRow } from './cabin';

/** Чтение справочников (только на сервере). */
export {
  listAircraftModels,
  listAirlines,
  listAirports,
  listAirportsInCity,
} from './server/service';
