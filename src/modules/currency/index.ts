/**
 * Модуль currency: курсы ЦБ в подвале и конвертер валют (L1-13, L1-S07).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/currency/server`,
 * компоненты — в `@/modules/currency/ui` (ADR-0008).
 */
export {
  BANNER_CODES,
  CURRENCIES,
  MAX_AMOUNT,
  convert,
  formatMoney,
  formatRate,
  parseAmount,
  parseCbrXml,
} from './model';
export type { CurrencyCode, Rate, Rates } from './model';
