/**
 * Модуль passengers: раздел «Пассажирам» — статические страницы с правилами Avocado Travel
 * (T-42). Общий вход: можно импортировать откуда угодно. Компоненты — в
 * `@/modules/passengers/ui`, сервис — в `@/modules/passengers/server` (ADR-0008).
 * Базы у модуля нет: текст страниц лежит в коде.
 */
export { PASSENGER_GROUPS, PASSENGER_PAGES } from './content';
export {
  PASSENGERS_PATH,
  PASSENGERS_REF_PREFIX,
  PASSENGER_DISCLAIMER,
  PASSENGER_SLUG_PATTERN,
  findPassengerPage,
  groupPassengerPages,
  passengerImageSrc,
  passengerPageHref,
  passengerSearchDocuments,
} from './model';
export type {
  PassengerBlock,
  PassengerGroup,
  PassengerGroupId,
  PassengerPage,
  PassengerSection,
} from './model';
