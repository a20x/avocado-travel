/**
 * Модуль exchange: обмен данными с другими приложениями (лаба 4) — публичный REST API,
 * его спецификация OpenAPI и документация. Общий вход: можно импортировать откуда угодно.
 * Маршруты — в `@/modules/exchange/server`, компоненты — в `@/modules/exchange/ui` (ADR-0008).
 */
export {
  ANALYTICS_REPORTS,
  API_BASE,
  API_RATE_LIMIT,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  aircraftModelSchema,
  airlineSchema,
  airportSchema,
  analyticsResponseSchema,
  errorSchema,
  flightDetailsSchema,
  flightOfferSchema,
  itemOf,
  listOf,
  newsItemSchema,
  newsListItemSchema,
  paginate,
  statsSummarySchema,
  validationMessage,
} from './model';
export type { AnalyticsReportName, ApiErrorCode } from './model';
export { API_ENDPOINTS, endpointById, endpointUrl } from './endpoints';
export type { ApiEndpoint, ApiEndpointId } from './endpoints';
export { buildOpenApi, parametersOf } from './openapi';
export type { ApiParameter } from './openapi';
