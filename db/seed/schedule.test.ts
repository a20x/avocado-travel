import { describe, expect, it } from 'vitest';
import { createRandom, departureTimes } from './schedule';

describe('генератор расписания', () => {
  it('случайные числа с одним зерном повторяются', () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(createRandom(43)()).not.toBe(first[0]);
  });

  it('раскладывает рейсы по дню с 06:30 до 23:30', () => {
    const times = departureTimes(6, createRandom(1));
    expect(times).toHaveLength(6);
    expect([...times].sort()).toEqual(times);
    expect(times[0]! >= '06:30').toBe(true);
    expect(times.at(-1)! <= '23:30').toBe(true);
  });
});
