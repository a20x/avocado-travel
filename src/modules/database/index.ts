/**
 * Модуль database: вкладка «БД» (лаба 3) — паспорт базы и пять видов запросов к ней с формами,
 * графиками и текстом SQL. Своих таблиц нет: читает рейсы, заказы, справочники и оценки.
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/database/server`,
 * компоненты — в `@/modules/database/ui` (ADR-0008).
 */
export {
  DB_REPORTS,
  FLIGHTS_PAGE_SIZE,
  FLIGHT_SORTS,
  dbHref,
  dbQuerySchema,
  fillScores,
  formatBytes,
  formatSql,
  share,
} from './model';
export type {
  AirlineRow,
  DbPassport,
  DbQuery,
  DbReport,
  DbResult,
  FlightRow,
  FlightSort,
  MonthRow,
  RatingRow,
  FlightCombo,
  RouteRow,
  SqlText,
} from './model';
