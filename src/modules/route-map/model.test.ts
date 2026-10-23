import { describe, expect, it } from 'vitest';
import { buildRouteMap } from './model';

const city = (slug: string, name: string) => ({ slug, name, lat: 0, lon: 0 });
const route = (from: string, to: string) => ({ origin: { slug: from }, destination: { slug: to } });

describe('карта маршрутов', () => {
  const cities = [
    city('moscow', 'Москва'),
    city('sochi', 'Сочи'),
    city('kazan', 'Казань'),
    city('ufa', 'Уфа'),
  ];

  it('туда и обратно — одна линия, города без рейсов на карту не попадают', () => {
    const map = buildRouteMap(cities, [
      route('moscow', 'sochi'),
      route('sochi', 'moscow'),
      route('moscow', 'kazan'),
    ]);
    expect(map.links).toEqual([
      { a: 'moscow', b: 'sochi' },
      { a: 'kazan', b: 'moscow' },
    ]);
    expect(map.cities.map((c) => c.slug)).toEqual(['moscow', 'sochi', 'kazan']);
  });

  it('направления из города — по алфавиту, без повторов', () => {
    const map = buildRouteMap(cities, [
      route('moscow', 'sochi'),
      route('moscow', 'kazan'),
      route('moscow', 'sochi'),
    ]);
    expect(map.destinations.moscow?.map((c) => c.name)).toEqual(['Казань', 'Сочи']);
    expect(map.destinations.sochi).toBeUndefined();
  });

  it('маршрут в неизвестный город пропускается', () => {
    expect(buildRouteMap(cities, [route('moscow', 'atlantis')]).links).toEqual([]);
  });
});
