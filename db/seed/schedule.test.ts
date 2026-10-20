import { describe, expect, it } from 'vitest';
import {
  basePrices,
  createRandom,
  departureTimes,
  distanceKm,
  flightMinutes,
  weekday,
} from './schedule';

describe('генератор расписания', () => {
  it('случайные числа с одним зерном повторяются', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(createRandom(43)()).not.toBe(first[0]);
  });

  it('считает расстояние между городами', () => {
    const moscow = { lat: 55.9726, lon: 37.4146 };
    const kaliningrad = { lat: 54.89, lon: 20.5926 };
    expect(distanceKm(moscow, kaliningrad)).toBeGreaterThan(1050);
    expect(distanceKm(moscow, kaliningrad)).toBeLessThan(1150);
  });

  it('время в пути и цена растут с расстоянием', () => {
    expect(flightMinutes(1100)).toBe(120);
    expect(flightMinutes(6400)).toBeGreaterThan(flightMinutes(1100));

    const near = basePrices(600);
    const far = basePrices(6000);
    expect(far.economy).toBeGreaterThan(near.economy);
    expect(near.business).toBeGreaterThan(near.economy);
    expect(near.economy % 10_000).toBe(0); // кратно 100 ₽
  });

  it('раскладывает рейсы по дню с 06:30 до 23:30', () => {
    const times = departureTimes(6, createRandom(1));
    expect(times).toHaveLength(6);
    expect([...times].sort()).toEqual(times);
    expect(times[0]! >= '06:30').toBe(true);
    expect(times.at(-1)! <= '23:30').toBe(true);
  });

  it('определяет день недели', () => {
    expect(weekday('2026-10-19')).toBe(1); // понедельник
    expect(weekday('2026-10-25')).toBe(7); // воскресенье
  });
});
