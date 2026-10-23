/**
 * Модуль rating: оценка сайта от 1 до 5 (L1-S02).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/rating/server`,
 * компоненты — в `@/modules/rating/ui` (ADR-0008).
 */
export { siteRatings } from './schema';
export { SCORES, formatAverage, ratingInputSchema, starFill } from './model';
export type { RatingError, RatingSummary } from './model';
