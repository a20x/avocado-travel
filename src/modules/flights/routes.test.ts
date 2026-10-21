import { describe, expect, it } from 'vitest';
import {
  summarizeAirlines,
  summarizeDestinations,
  summarizeRoutes,
  type RouteStatRow,
} from './routes';

const CITY = {
  moscow: 'Москва',
  kazan: 'Казань',
  sochi: 'Сочи',
} as const;

function row(
  from: keyof typeof CITY,
  to: keyof typeof CITY,
  airline: 'LST' | 'ORN',
  overrides: Partial<RouteStatRow> = {},
): RouteStatRow {
  return {
    originSlug: from,
    originCity: CITY[from],
    destinationSlug: to,
    destinationCity: CITY[to],
    airlineCode: airline,
    airlineName: airline === 'LST' ? 'Ластавиа' : 'Орнавиа',
    manufacturer: 'Airbus',
    model: 'A320neo',
    flights: 7,
    minPrice: 500_000,
    durationMinutes: 100,
    ...overrides,
  };
}

const rows = [
  row('moscow', 'sochi', 'LST', { flights: 14, minPrice: 610_000, durationMinutes: 150 }),
  row('moscow', 'sochi', 'ORN', { minPrice: 540_000, durationMinutes: 155 }),
  row('moscow', 'sochi', 'ORN', { manufacturer: 'Boeing', model: '737-800', flights: 3 }),
  row('kazan', 'sochi', 'LST', { flights: 3, minPrice: 480_000 }),
  row('sochi', 'moscow', 'LST'),
];

describe('сводки маршрутов', () => {
  it('объединяет авиакомпании и самолёты одного маршрута', () => {
    const routes = summarizeRoutes(rows);
    // По алфавиту города вылета: Казань, Москва, Сочи.
    expect(routes.map((r) => `${r.origin.slug}>${r.destination.slug}`)).toEqual([
      'kazan>sochi',
      'moscow>sochi',
      'sochi>moscow',
    ]);
    expect(routes[1]).toMatchObject({
      airlines: [
        { code: 'LST', name: 'Ластавиа' },
        { code: 'ORN', name: 'Орнавиа' },
      ],
      flightsPerWeek: 24,
      minPrice: 500_000,
      durationMinutes: 100,
    });
  });

  it('считает по городу прилёта число городов, рейсов и минимальную цену', () => {
    const sochi = summarizeDestinations(summarizeRoutes(rows)).get('sochi');
    expect(sochi).toEqual({ originCount: 2, flightsPerWeek: 27, minPrice: 480_000 });
  });

  it('считает маршруты туда-обратно один раз и собирает флот авиакомпании', () => {
    const stats = summarizeAirlines(rows);
    expect(stats.get('LST')).toEqual({
      routes: 2,
      cities: 3,
      flightsPerWeek: 24,
      fleet: [{ manufacturer: 'Airbus', model: 'A320neo' }],
    });
    expect(stats.get('ORN')?.fleet.map((a) => a.model)).toEqual(['A320neo', '737-800']);
  });
});
