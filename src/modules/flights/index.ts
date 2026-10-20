/**
 * Модуль flights: рейсы и поиск рейсов.
 * Общий вход: можно импортировать откуда угодно, в том числе из клиентских компонентов.
 * Серверные функции — в `@/modules/flights/server` (ADR-0008).
 */

/** Таблица публикуется для внешних ключей и чтения в чужих репозиториях (ADR-0007). */
export { flights } from './schema';

export { MAX_PASSENGERS, SEARCH_DAYS_AHEAD, SORT_OPTIONS, searchQuerySchema } from './model';
export type { Flight, FlightOffer, SearchError, SearchQuery, SortOption } from './model';
