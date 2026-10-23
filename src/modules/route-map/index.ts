/**
 * Модуль route-map: карта маршрутов на Leaflet и OpenStreetMap (L1-S08).
 * Общий вход: можно импортировать откуда угодно. Сервисы — в `@/modules/route-map/server`,
 * компоненты — в `@/modules/route-map/ui` (ADR-0008).
 */
export { buildRouteMap } from './model';
export type { MapCity, MapLink, RouteMapData } from './model';
