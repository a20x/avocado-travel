/**
 * Модуль database: вкладка «БД» (лаба 3) — меню разделов, паспорт базы и шесть видов запросов
 * к ней с формами, графиками и текстом SQL. Своих таблиц нет: читает рейсы, заказы, справочники и оценки.
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/database/server`,
 * компоненты — в `@/modules/database/ui` (ADR-0008).
 */
export {
  DB_REPORTS,
  DB_SECTIONS,
  FLIGHTS_PAGE_SIZE,
  FLIGHT_SORTS,
  dbHref,
  dbQuerySchema,
  fillScores,
  formatBytes,
  formatSql,
  isReport,
  pickAirline,
  sectionHref,
  sectionOf,
  share,
} from './model';
export type {
  AirlineOption,
  AirlineRow,
  DbPassport,
  DbQuery,
  DbReport,
  DbResult,
  DbSection,
  DbView,
  FlightRow,
  FlightSort,
  MonthRow,
  RatingRow,
  FlightCombo,
  RouteRow,
  SqlText,
} from './model';
