/**
 * Модуль analytics: отчёты о продажах с графиками (лаба 3). Общий вход: можно импортировать
 * откуда угодно. Сервисы — в `@/modules/analytics/server`, компоненты — в
 * `@/modules/analytics/ui` (ADR-0008). Своих таблиц нет: отчёты читают заказы, рейсы и справочники.
 */
export {
  DEFAULT_PERIOD_MONTHS,
  TOP_DESTINATIONS,
  fillMonths,
  formatRubCompact,
  monthLabel,
  monthShortLabel,
  monthsOf,
  occupancyBy,
  parseAnalyticsFilter,
  percent,
  periodDays,
  sharesOf,
} from './model';
export type {
  AnalyticsFilter,
  AnalyticsReport,
  MonthRevenue,
  Occupancy,
  RouteSales,
  SalesPair,
  SalesTotals,
  Share,
} from './model';
