/**
 * Модуль press: пресс-релизы из JSON-файла с сортировкой и выборкой (лаба 2).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/press/server`,
 * компоненты — в `@/modules/press/ui` (ADR-0008). Базы у модуля нет: данные — файл
 * content/press/press-releases.json.
 */
export {
  PRESS_CATEGORIES,
  PRESS_SORTS,
  buildPressView,
  parsePressFile,
  pressFileSchema,
  pressQuerySchema,
  pressReleaseSchema,
  pressSearchDocuments,
} from './model';
export type {
  PressCategory,
  PressFacet,
  PressItemView,
  PressQuery,
  PressRelease,
  PressSort,
  PressView,
} from './model';
