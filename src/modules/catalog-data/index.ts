/**
 * Модуль catalog-data: справочники городов, аэропортов, авиакомпаний и моделей самолётов.
 * Общий вход: можно импортировать откуда угодно, в том числе из клиентских компонентов.
 * Серверные функции (чтение из базы) — в `@/modules/catalog-data/server` (ADR-0008).
 */

/** Таблицы публикуются для внешних ключей и чтения в чужих репозиториях (ADR-0007). */
export { aircraftModels, airlines, airports, cities } from './schema';

export type {
  AircraftModel,
  Airline,
  AirlineAdminRow,
  AirlineInput,
  Airport,
  AirportRecord,
  CatalogDataError,
  CityAdminRow,
  CityInput,
  CityRecord,
} from './model';

/** Формы админки: проверка ввода городов и авиакомпаний. */
export {
  DEFAULT_AIRLINE_LOGO,
  airlineInputSchema,
  cityInputSchema,
  isTimeZone,
  listTimeZones,
  newAirlineSchema,
  newCitySchema,
} from './model';

/** Схема салона и вместимость самолёта. */
export { buildCabin, listSeats, parseLayout, seatCapacity, seatClass } from './cabin';
export type { CabinClass, CabinRow } from './cabin';

/** Города с их аэропортами — для страниц направлений и поиска по сайту. */
export { citySearchDocument, groupCities } from './cities';
export type { City } from './cities';
