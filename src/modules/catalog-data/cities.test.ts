import { describe, expect, it } from 'vitest';
import { groupCities } from './cities';
import type { Airport } from './model';

function airport(id: number, iata: string, city: string, citySlug: string): Airport {
  return {
    id,
    iata,
    name: iata,
    city,
    citySlug,
    country: 'Россия',
    lat: 0,
    lon: 0,
    timezone: 'Europe/Moscow',
  };
}

describe('города', () => {
  it('собирает аэропорты одного города вместе', () => {
    const cities = groupCities([
      airport(1, 'DME', 'Москва', 'moscow'),
      airport(2, 'KZN', 'Казань', 'kazan'),
      airport(3, 'SVO', 'Москва', 'moscow'),
    ]);

    expect(cities.map((city) => city.slug)).toEqual(['moscow', 'kazan']);
    expect(cities[0]?.airports.map((a) => a.iata)).toEqual(['DME', 'SVO']);
  });

  it('берёт описание и иллюстрацию города, для неизвестного — общую картинку', () => {
    const [kazan, unknown] = groupCities([
      airport(1, 'KZN', 'Казань', 'kazan'),
      airport(2, 'XXX', 'Новый город', 'new-city'),
    ]);

    expect(kazan?.description).not.toBe('');
    expect(kazan?.image).toBe('/images/destinations/kazan.svg');
    expect(unknown?.description).toBe('');
    expect(unknown?.image).toBe('/images/destinations/default.svg');
  });
});
