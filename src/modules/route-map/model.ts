/** Город на карте. */
export type MapCity = { slug: string; name: string; lat: number; lon: number };

/** Линия между двумя городами: туда и обратно — одна линия. */
export type MapLink = { a: string; b: string };

export type RouteMapData = {
  cities: MapCity[];
  links: MapLink[];
  /** Куда летают из каждого города: slug → города прилёта по алфавиту. */
  destinations: Record<string, Array<{ slug: string; name: string }>>;
};

/**
 * Данные карты из городов и маршрутов в одну сторону. На карте — только города,
 * у которых есть рейсы; встречные маршруты A→B и B→A рисуются одной линией.
 */
export function buildRouteMap(
  cities: MapCity[],
  routes: Array<{ origin: { slug: string }; destination: { slug: string } }>,
): RouteMapData {
  const bySlug = new Map(cities.map((city) => [city.slug, city]));
  const links = new Map<string, MapLink>();
  const destinations: RouteMapData['destinations'] = {};

  for (const { origin, destination } of routes) {
    const to = bySlug.get(destination.slug);
    if (!bySlug.has(origin.slug) || !to) continue;
    const [a, b] = [origin.slug, destination.slug].sort();
    if (a && b) links.set(`${a}|${b}`, { a, b });
    const list = (destinations[origin.slug] ??= []);
    if (!list.some((city) => city.slug === to.slug)) list.push({ slug: to.slug, name: to.name });
  }

  for (const list of Object.values(destinations)) {
    list.sort((x, y) => x.name.localeCompare(y.name, 'ru'));
  }
  const connected = new Set([...links.values()].flatMap((link) => [link.a, link.b]));
  return {
    cities: cities.filter((city) => connected.has(city.slug)),
    links: [...links.values()],
    destinations,
  };
}
