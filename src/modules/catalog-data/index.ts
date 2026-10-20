/**
 * Модуль catalog-data: справочники аэропортов, авиакомпаний и моделей самолётов.
 * Общий вход: можно импортировать откуда угодно, в том числе из клиентских компонентов.
 * Серверные функции (чтение из базы) — в `@/modules/catalog-data/server` (ADR-0008).
 */

/** Таблицы публикуются для внешних ключей и чтения в чужих репозиториях (ADR-0007). */
export { aircraftModels, airlines, airports } from './schema';

export type { AircraftModel, Airline, Airport } from './model';

/** Схема салона и вместимость самолёта. */
export { buildCabin, listSeats, parseLayout, seatCapacity, seatClass } from './cabin';
export type { CabinClass, CabinRow } from './cabin';
