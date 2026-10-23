import 'server-only';
import { listCities } from '@/modules/catalog-data/server';
import { listRoutes } from '@/modules/flights/server';
import { buildRouteMap, type RouteMapData } from '../model';

/** Все города и маршруты сети на ближайшую неделю — для карты. */
export async function getRouteMap(now = new Date()): Promise<RouteMapData> {
  const [cities, routes] = await Promise.all([listCities(), listRoutes({}, now)]);
  return buildRouteMap(cities, routes);
}
