/**
 * Сводки по сети маршрутов за неделю: для страниц направлений и авиакомпаний.
 * База отдаёт сгруппированные строки, а эти чистые функции собирают из них сводки.
 */

/** Строка из базы: маршрут × авиакомпания × модель самолёта за неделю. */
export type RouteStatRow = {
  originSlug: string;
  originCity: string;
  destinationSlug: string;
  destinationCity: string;
  airlineCode: string;
  airlineName: string;
  manufacturer: string;
  model: string;
  flights: number;
  /** Самая низкая цена эконома, копейки. */
  minPrice: number;
  durationMinutes: number;
};

type Place = { slug: string; city: string };

/** Маршрут между двумя городами в одну сторону. */
export type RouteSummary = {
  origin: Place;
  destination: Place;
  airlines: Array<{ code: string; name: string }>;
  flightsPerWeek: number;
  minPrice: number;
  durationMinutes: number;
};

/** Сколько городов и рейсов ведёт в город и почём. */
export type DestinationStats = {
  originCount: number;
  flightsPerWeek: number;
  minPrice: number;
};

/** Чем занята авиакомпания: маршруты, города и самолёты, на которых она летает. */
export type AirlineStats = {
  /** Пары городов, между которыми летает (туда и обратно — один маршрут). */
  routes: number;
  cities: number;
  flightsPerWeek: number;
  fleet: Array<{ manufacturer: string; model: string }>;
};

const byRu = (a: string, b: string) => a.localeCompare(b, 'ru');

/** Собирает маршруты из строк базы; порядок — по городу вылета, затем прилёта. */
export function summarizeRoutes(rows: RouteStatRow[]): RouteSummary[] {
  const routes = new Map<string, RouteSummary>();
  for (const row of rows) {
    const key = `${row.originSlug}>${row.destinationSlug}`;
    let route = routes.get(key);
    if (!route) {
      route = {
        origin: { slug: row.originSlug, city: row.originCity },
        destination: { slug: row.destinationSlug, city: row.destinationCity },
        airlines: [],
        flightsPerWeek: 0,
        minPrice: row.minPrice,
        durationMinutes: row.durationMinutes,
      };
      routes.set(key, route);
    }
    if (!route.airlines.some((airline) => airline.code === row.airlineCode)) {
      route.airlines.push({ code: row.airlineCode, name: row.airlineName });
    }
    route.flightsPerWeek += row.flights;
    route.minPrice = Math.min(route.minPrice, row.minPrice);
    route.durationMinutes = Math.min(route.durationMinutes, row.durationMinutes);
  }

  return [...routes.values()]
    .map((route) => ({ ...route, airlines: route.airlines.sort((a, b) => byRu(a.name, b.name)) }))
    .sort(
      (a, b) => byRu(a.origin.city, b.origin.city) || byRu(a.destination.city, b.destination.city),
    );
}

/** Сводка по городам прилёта, ключ — `citySlug`. */
export function summarizeDestinations(routes: RouteSummary[]): Map<string, DestinationStats> {
  const result = new Map<string, DestinationStats>();
  for (const route of routes) {
    const stats = result.get(route.destination.slug);
    if (stats) {
      stats.originCount += 1;
      stats.flightsPerWeek += route.flightsPerWeek;
      stats.minPrice = Math.min(stats.minPrice, route.minPrice);
    } else {
      result.set(route.destination.slug, {
        originCount: 1,
        flightsPerWeek: route.flightsPerWeek,
        minPrice: route.minPrice,
      });
    }
  }
  return result;
}

/** Сводка по авиакомпаниям, ключ — код авиакомпании. */
export function summarizeAirlines(rows: RouteStatRow[]): Map<string, AirlineStats> {
  const groups = new Map<string, RouteStatRow[]>();
  for (const row of rows) {
    groups.set(row.airlineCode, [...(groups.get(row.airlineCode) ?? []), row]);
  }

  const result = new Map<string, AirlineStats>();
  for (const [code, airlineRows] of groups) {
    const pairs = new Set(
      airlineRows.map((r) => [r.originSlug, r.destinationSlug].sort().join('|')),
    );
    const cities = new Set(airlineRows.flatMap((r) => [r.originSlug, r.destinationSlug]));
    const fleet = new Map(
      airlineRows.map((r) => [
        `${r.manufacturer} ${r.model}`,
        { manufacturer: r.manufacturer, model: r.model },
      ]),
    );
    result.set(code, {
      routes: pairs.size,
      cities: cities.size,
      flightsPerWeek: airlineRows.reduce((sum, r) => sum + r.flights, 0),
      fleet: [...fleet.entries()].sort(([a], [b]) => byRu(a, b)).map(([, aircraft]) => aircraft),
    });
  }
  return result;
}
