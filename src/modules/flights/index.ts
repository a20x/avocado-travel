/**
 * Модуль flights: рейсы и поиск рейсов.
 * Общий вход: можно импортировать откуда угодно, в том числе из клиентских компонентов.
 * Серверные функции — в `@/modules/flights/server` (ADR-0008).
 */

/** Таблица публикуется для внешних ключей и чтения в чужих репозиториях (ADR-0007). */
export { flights } from './schema';

export {
  DEPARTURE_PERIODS,
  MAX_PASSENGERS,
  SEARCH_DAYS_AHEAD,
  SORT_OPTIONS,
  searchQuerySchema,
} from './model';
export type {
  AirlineFacet,
  DeparturePeriod,
  Flight,
  FlightDetails,
  FlightError,
  FlightOffer,
  SearchError,
  SearchQuery,
  SearchResult,
  SortOption,
} from './model';

/** Ссылка на поиск и дата по умолчанию — нужны и страницам других разделов. */
export { defaultSearchDate, searchUrl } from './search';
export type { SearchLink } from './search';
export type { AirlineStats, DestinationStats, RouteSummary } from './routes';
export type { SeatInfo, SeatMapRow } from './seat-map';
