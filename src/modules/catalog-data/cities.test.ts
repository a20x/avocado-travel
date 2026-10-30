import { describe, expect, it } from 'vitest';
import { groupCities } from './cities';
import type { AirportRecord, CityRecord } from './model';

const created = new Date('2026-01-01T00:00:00Z');

function city(slug: string, name: string): CityRecord {
  return {
    id: 1,
    slug,
    name,
    nameFrom: `из ${name}`,
    nameTo: `в ${name}`,
    country: 'Россия',
    description: '',
    image: '/images/destinations/default.svg',
    createdAt: created,
    updatedAt: created,
  };
}

function airport(id: number, iata: string, citySlug: string, lat = 0): AirportRecord {
  return { id, iata, name: iata, citySlug, lat, lon: 0, timezone: 'Europe/Moscow' };
}

describe('города', () => {
  it('собирает аэропорты одного города вместе в порядке городов', () => {
    const cities = groupCities(
      [city('kazan', 'Казань'), city('moscow', 'Москва')],
      [
        airport(1, 'DME', 'moscow', 55.4),
        airport(2, 'KZN', 'kazan', 55.6),
        airport(3, 'SVO', 'moscow', 55.9),
      ],
    );

    expect(cities.map((item) => item.slug)).toEqual(['kazan', 'moscow']);
    expect(cities[1]?.airports.map((a) => a.iata)).toEqual(['DME', 'SVO']);
    // Координаты города — первого аэропорта.
    expect(cities[1]?.lat).toBe(55.4);
    expect(cities[1]?.nameTo).toBe('в Москва');
  });

  it('пропускает город без аэропортов', () => {
    const cities = groupCities(
      [city('kazan', 'Казань'), city('empty', 'Пусто')],
      [airport(1, 'KZN', 'kazan')],
    );
    expect(cities.map((item) => item.slug)).toEqual(['kazan']);
  });
});
