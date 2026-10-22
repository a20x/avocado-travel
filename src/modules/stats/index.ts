/**
 * Модуль stats: счётчик посещений и отчёт в админке (L1-S01, L1-08).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/stats/server`,
 * компоненты — в `@/modules/stats/ui` (ADR-0008).
 */
export { pageViews } from './schema';
export {
  MAX_PERIOD_DAYS,
  SECTION_LABELS,
  hitInputSchema,
  isBot,
  isSearchEngine,
  isTrackedPath,
  normalizePath,
  parsePeriod,
  referrerHost,
  sectionOf,
} from './model';
export type { Counters, HitInput, StatsReport, Totals } from './model';
