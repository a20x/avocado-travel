/**
 * Модуль exchange: обмен данными с другими приложениями (лаба 4) — публичный REST API,
 * его спецификация OpenAPI и документация, ленты JSON Feed и RSS, импорт внешних RSS-лент
 * (таблица external_feeds) и вкладка «RSS» с общей лентой и выгрузками в CSV, XML и ASCII. Общий вход: можно импортировать откуда угодно.
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
  newsRowSchema,
  reportRowSchema,
  scheduleRowSchema,
  paginate,
  statsSummarySchema,
  validationMessage,
} from './model';
export type { AnalyticsReportName, ApiErrorCode } from './model';
export { API_ENDPOINTS, endpointById, endpointUrl } from './endpoints';
export type { ApiEndpoint, ApiEndpointId } from './endpoints';
export { buildOpenApi, parametersOf } from './openapi';
export { FEED_SIZE, buildFeed } from './feed';
export { csvCell, toCsv, toJsonRows } from './csv';
export type { ExportColumn, ExportTable, ExportValue } from './csv';
export { analyticsTable, exportFilename, newsTable, scheduleTable } from './exports';
export type { ApiParameter } from './openapi';
export {
  INDUSTRY_CATEGORIES,
  MAX_FEEDS,
  feedIdFor,
  feedInputSchema,
  isPrivateAddress,
} from './feeds';
export type { ExternalFeed, ExternalFeedStatus, FeedInput, IndustryCategory } from './feeds';
export {
  COMBINED_PAGE_SIZE,
  COMBINED_SORTS,
  EXCHANGE_FIELDS,
  EXCHANGE_FORMATS,
  EXPORT_LIMIT,
  asciiValue,
  combinedAscii,
  combinedCsv,
  combinedHref,
  combinedQuerySchema,
  combinedWrapped,
  combinedXml,
  exportCombined,
  toRss,
} from './combined';
export type {
  CombinedNewsItem,
  CombinedQuery,
  CombinedSort,
  ExchangeFormat,
  RssChannel,
} from './combined';
export { externalFeeds } from './schema';
export {
  INDUSTRY_MAX_AGE_DAYS,
  autoTags,
  htmlToText,
  mentionsRealAirline,
  normalizeLink,
  prepareIndustryNews,
  summarize,
} from './industry';
export type { IndustryNewsDraft } from './industry';
export { decodeFeed, parseFeed } from './rss';
export type { FeedItem } from './rss';
